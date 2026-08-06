import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Lecture } from "./lecture.model.js";
import { Course } from "../course/course.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { Transcript } from "../transcript/transcript.model.js";
import { uploadVideoOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { getOwnedLecture } from "./lecture.service.js";

// ─── Controllers ───────────────────────────────────────────────────────────────

export const addLecture = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order, isFree, releaseDate } = req.body;

  if (!title || order === undefined) throw new ApiError(400, "Title and order are required");
  if (!req.file) throw new ApiError(400, "Video file is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to add lectures to this course");
  }

  const existingLecture = await Lecture.findOne({ course: courseId, order: Number(order) });
  if (existingLecture) throw new ApiError(400, "A lecture with this order already exists");

  const uploaded = await uploadVideoOnCloudinary(req.file.path);
  if (!uploaded) throw new ApiError(500, "Video upload failed");

  const lecture = await Lecture.create({
    course: courseId,
    title,
    description: description || "",
    video: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      duration: uploaded.duration || 0,
    },
    order: Number(order),
    isFree: isFree === "true" || isFree === true,
    releaseDate: releaseDate || null,
    isPublished: true,
    processingStatus: "pending",
  });

  await Course.findByIdAndUpdate(courseId, {
    $inc: {
      totalLectures: 1,
      totalDuration: uploaded.duration || 0,
    },
  });

  return res.status(201).json(new ApiResponse(201, lecture, "Lecture added successfully"));
});


export const updateLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const lecture = await getOwnedLecture(lectureId, req.user._id);

  const { title, description, order, isFree } = req.body;

  if (req.file) {
    if (lecture.video.publicId) await deleteFromCloudinary(lecture.video.publicId, "video");

    const uploaded = await uploadVideoOnCloudinary(req.file.path);
    if (!uploaded) throw new ApiError(500, "Video upload failed");

    const durationDiff = (uploaded.duration || 0) - lecture.video.duration;
    await Course.findByIdAndUpdate(lecture.course._id, { $inc: { totalDuration: durationDiff } });

    lecture.video = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      duration: uploaded.duration || 0,
    };
  }

  if (title) lecture.title = title;
  if (description !== undefined) lecture.description = description;
  if (order !== undefined) lecture.order = Number(order);
  if (isFree !== undefined) lecture.isFree = isFree === "true" || isFree === true;

  await lecture.save();

  return res.status(200).json(new ApiResponse(200, lecture, "Lecture updated successfully"));
});


export const deleteLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const lecture = await getOwnedLecture(lectureId, req.user._id);

  if (lecture.video.publicId) await deleteFromCloudinary(lecture.video.publicId, "video");

  await Course.findByIdAndUpdate(lecture.course._id, {
    $inc: {
      totalLectures: -1,
      totalDuration: -(lecture.video.duration || 0),
    },
  });

  await Lecture.findByIdAndDelete(lectureId);

  return res.status(200).json(new ApiResponse(200, null, "Lecture deleted successfully"));
});


export const getCourseLectures = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");

  let isInstructor = false;
  let isEnrolled   = false;

  if (req.user) {
    isInstructor = course.instructor.toString() === req.user._id.toString();

    if (!isInstructor && !course.isFree) {
      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: courseId,
        isActive: true,
      });
      isEnrolled = !!enrollment;
    }
  }

  // Instructor sees ALL lectures (published + unpublished)
  // Everyone else sees only published lectures
  const lectureFilter = isInstructor
    ? { course: courseId }
    : { course: courseId, isPublished: true };

  const lectures = await Lecture.find(lectureFilter)
    .select("-__v")
    .sort({ order: 1 });

  // Attach each lecture's summary status in one batched
  // query, so ManageCoursePage can show a "Summary" done/pending indicator.
  const transcripts = await Transcript.find({ lecture: { $in: lectures.map((l) => l._id) } })
    .select("lecture summaryStatus");
  const summaryStatusByLecture = new Map(
    transcripts.map((t) => [t.lecture.toString(), t.summaryStatus])
  );

  const lecturesData = lectures.map((lecture) => {
    const lec = lecture.toObject();
    delete lec.video?.publicId;

    lec.summaryStatus = summaryStatusByLecture.get(lecture._id.toString()) || "none";

    // Full access: instructor, free course, or enrolled student
    let hasFullAccess = isInstructor || course.isFree || isEnrolled || lec.isFree;

    // Drip content — lock lectures with a future releaseDate for everyone except the instructor.
    const isDripLocked = !isInstructor && lec.releaseDate && new Date(lec.releaseDate) > new Date();
    lec.isDripLocked = !!isDripLocked; // exposed so the frontend can show "Available on <date>"
    if (isDripLocked) hasFullAccess = false;

    if (!hasFullAccess) {
      lec.video = { url: null, duration: lec.video?.duration ?? 0 };
    }

    return lec;
  });

  return res.status(200).json(
    new ApiResponse(200, {
      lectures: lecturesData,
      total: lecturesData.length,
      isEnrolled: course.isFree ? true : isEnrolled,
      isInstructor,
      isFree: course.isFree,
      isArchived: course.isArchived,
    }, "Lectures fetched successfully")
  );
});


export const getLectureById = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId)
    .populate("course", "title isFree instructor")
    .select("-__v");

  if (!lecture || !lecture.isPublished) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course?.instructor) throw new ApiError(404, "This course is no longer available");

  const isInstructor = course.instructor.toString() === req.user._id.toString();

  if (isInstructor || course.isFree || lecture.isFree) {
    return res.status(200).json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: course._id,
    isActive: true,
  });

  if (!enrollment) {
    throw new ApiError(403, "Please purchase and enroll in this course to access this lecture");
  }

  return res.status(200).json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
});


export const getInstructorLectures = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view lectures for this course");
  }

  const lectures = await Lecture.find({ course: courseId }).select("-__v").sort({ order: 1 });

  return res.status(200).json(
    new ApiResponse(200, { lectures, total: lectures.length }, "Lectures fetched successfully")
  );
});
