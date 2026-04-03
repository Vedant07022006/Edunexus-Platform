import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Lecture } from "../models/lecture.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import {
  uploadVideoOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// ================= ADD LECTURE =================
export const addLecture = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order, isFree } = req.body;

  if (!title || order === undefined) {
    throw new ApiError(400, "Title and order are required");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to add lectures to this course");
  }

  if (!req.file) throw new ApiError(400, "Video file required");

  // Prevent duplicate order
  const existingLecture = await Lecture.findOne({
    course: courseId,
    order: Number(order),
  });
  if (existingLecture) {
    throw new ApiError(400, "A lecture with this order already exists");
  }

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
    isPublished: true,
    processingStatus: "completed",
  });

  await Course.findByIdAndUpdate(courseId, {
    $inc: {
      totalLectures: 1,
      totalDuration: uploaded.duration || 0,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, lecture, "Lecture added successfully"));
});

// ================= UPDATE LECTURE =================
export const updateLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { title, description, order, isFree } = req.body;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  if (lecture.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this lecture");
  }

  if (req.file) {
    if (lecture.video.publicId) {
      await deleteFromCloudinary(lecture.video.publicId, "video");
    }

    const uploaded = await uploadVideoOnCloudinary(req.file.path);
    if (!uploaded) throw new ApiError(500, "Video upload failed");

    const durationDiff = (uploaded.duration || 0) - lecture.video.duration;

    await Course.findByIdAndUpdate(lecture.course._id, {
      $inc: { totalDuration: durationDiff },
    });

    lecture.video = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      duration: uploaded.duration || 0,
    };
  }

  if (title) lecture.title = title;
  if (description) lecture.description = description;
  if (order !== undefined) lecture.order = Number(order);
  if (isFree !== undefined) {
    lecture.isFree = isFree === "true" || isFree === true;
  }

  await lecture.save();

  return res
    .status(200)
    .json(new ApiResponse(200, lecture, "Lecture updated successfully"));
});

// ================= DELETE LECTURE =================
export const deleteLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  if (lecture.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to delete this lecture");
  }

  if (lecture.video.publicId) {
    await deleteFromCloudinary(lecture.video.publicId, "video");
  }

  await Course.findByIdAndUpdate(lecture.course._id, {
    $inc: {
      totalLectures: -1,
      totalDuration: -lecture.video.duration,
    },
  });

  await Lecture.findByIdAndDelete(lectureId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Lecture deleted successfully"));
});

// ================= GET COURSE LECTURES (Public with optional auth) =================
//
// Access control matrix:
// ┌──────────────────────────────┬──────────────────────────────────────┐
// │ Who is the requester?        │ What do they get?                    │
// ├──────────────────────────────┼──────────────────────────────────────┤
// │ Guest (no token / bad token) │ Metadata only — video.url = null     │
// │ Logged-in, FREE course       │ All videos — no enrollment needed    │
// │ Logged-in, PAID, not enrolled│ Metadata only — video.url = null     │
// │ Enrolled student, PAID course│ All videos                           │
// │ Course instructor            │ All videos (full access)             │
// └──────────────────────────────┴──────────────────────────────────────┘
//
// FREE course  → login is enough, no enrollment step required
// PAID course  → enrollment is mandatory to see video URLs
//
export const getCourseLectures = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const lectures = await Lecture.find({
    course: courseId,
    isPublished: true,
  })
    .select("-__v")
    .sort({ order: 1 });

  // ── Determine access level ──────────────────────────────────────────────
  let isInstructor = false;
  let isEnrolled = false;

  if (req.user) {
    // Is this the course's instructor?
    isInstructor =
      course.instructor.toString() === req.user._id.toString();

    // For paid courses only: check enrollment
    if (!isInstructor && !course.isFree) {
      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: courseId,
        isActive: true,
      });
      isEnrolled = !!enrollment;
    }
  }

  // ── Build response ──────────────────────────────────────────────────────
  const lecturesData = lectures.map((lecture) => {
    const lec = lecture.toObject();

    // Never expose the Cloudinary publicId to clients
    delete lec.video?.publicId;

    // ── GUEST (no token, expired token, deleted user) ───────────────────
    // Guests never get video URLs
    if (!req.user) {
      lec.video = { url: null, duration: lec.video?.duration ?? 0 };
      return lec;
    }

    // ── INSTRUCTOR of this course ───────────────────────────────────────
    // Full access always
    if (isInstructor) {
      return lec;
    }

    // ── FREE COURSE ─────────────────────────────────────────────────────
    // Any logged-in user gets full video access — no enrollment needed
    if (course.isFree) {
      return lec;
    }

    // ── PAID COURSE — ENROLLED STUDENT ──────────────────────────────────
    // Must have an active enrollment to see videos
    if (isEnrolled) {
      return lec;
    }

    // ── PAID COURSE — FREE PREVIEW LECTURE ──────────────────────────────
    // Non-enrolled students can still watch lectures marked isFree
    if (lec.isFree) {
      return lec;
    }

    // ── PAID COURSE — NOT ENROLLED ──────────────────────────────────────
    // Hide video URLs for paid lectures; show metadata only
    lec.video = { url: null, duration: lec.video?.duration ?? 0 };
    return lec;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        lectures: lecturesData,
        total: lecturesData.length,
        isEnrolled: course.isFree ? true : isEnrolled, // free = always treated as enrolled
        isInstructor,
        isFree: course.isFree,
      },
      "Lectures fetched successfully"
    )
  );
});

// ================= GET SINGLE LECTURE BY ID =================
//
// Requires login (verifyJWT). Access rules:
//  - Instructor of the course → always full access
//  - FREE course              → any logged-in user, no enrollment needed
//  - PAID course              → enrolled student only
//
export const getLectureById = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId)
    .populate("course", "title isFree instructor")
    .select("-__v");

  if (!lecture || !lecture.isPublished) {
    throw new ApiError(404, "Lecture not found");
  }

  const course = lecture.course;

  // ── Instructor → full access ────────────────────────────────────────────
  const isInstructor =
    course.instructor.toString() === req.user._id.toString();

  if (isInstructor) {
    return res
      .status(200)
      .json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
  }

  // ── Free course → any logged-in user can watch ──────────────────────────
  if (course.isFree) {
    return res
      .status(200)
      .json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
  }

  // ── Paid course → must be enrolled ─────────────────────────────────────
  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: course._id,
    isActive: true,
  });

  if (!enrollment) {
    throw new ApiError(
      403,
      "Please purchase and enroll in this course to access this lecture"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
});

// ================= GET INSTRUCTOR'S COURSE LECTURES =================
//
// Instructor-only: returns ALL lectures (including unpublished drafts)
// for their own course. Requires verifyJWT + isInstructor middleware.
//
export const getInstructorLectures = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view lectures for this course");
  }

  const lectures = await Lecture.find({ course: courseId })
    .select("-__v")
    .sort({ order: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      { lectures, total: lectures.length },
      "Lectures fetched successfully"
    )
  );
});
