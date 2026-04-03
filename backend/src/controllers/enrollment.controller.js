import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Lecture } from "../models/lecture.model.js";
import { sendEnrollmentEmail } from "../utils/email.js";


// ─── Internal helper ───────────────────────────────────────────────────────────
//
// Handles idempotent enrollment for free courses.
// If the student is already enrolled (even if inactive), it re-activates it.
// Also updates course.totalEnrollments and user.enrolledCourses array.
//
const autoEnrollFreeCourse = async (
  userId,
  courseId,
  courseName,
  userEmail,
  userName
) => {
  const existing = await Enrollment.findOne({ user: userId, course: courseId });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return existing;
  }

  const enrollment = await Enrollment.create({
    user: userId,
    course: courseId,
    isActive: true,
    progress: 0,
  });

  await Course.findByIdAndUpdate(courseId, {
    $inc: { totalEnrollments: 1 },
  });

  // $addToSet prevents duplicate entries in the embedded array
  await User.findByIdAndUpdate(userId, {
    $addToSet: {
      enrolledCourses: { course: courseId, enrolledAt: new Date() },
    },
  });

  try {
    await sendEnrollmentEmail(userEmail, {
      studentName: userName,
      courseName,
    });
  } catch (err) {
    console.error("Auto-enrollment email failed:", err.message);
  }

  return enrollment;
};


// ─── ENROLL IN FREE COURSE ─────────────────────────────────────────────────────
export const enrollFreeCourse = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students can enroll in courses");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (!course.isPublished) {
    throw new ApiError(400, "This course is not published yet");
  }

  if (!course.isFree) {
    throw new ApiError(
      400,
      "This is a paid course. Please purchase it to enroll."
    );
  }

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });

  if (existingEnrollment) {
    throw new ApiError(400, "You are already enrolled in this course");
  }

  const enrollment = await autoEnrollFreeCourse(
    req.user._id,
    courseId,
    course.title,
    req.user.email,
    req.user.fullName
  );

  return res
    .status(201)
    .json(new ApiResponse(201, enrollment, "Enrolled successfully"));
});


// ─── CHECK ENROLLMENT STATUS ───────────────────────────────────────────────────
export const checkEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      isEnrolled: !!enrollment,
      enrollment: enrollment || null,
    })
  );
});


// ─── GET MY ENROLLMENTS ────────────────────────────────────────────────────────
export const getMyEnrollments = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students can view enrollments");
  }

  const enrollments = await Enrollment.find({
    user: req.user._id,
    isActive: true,
  })
    .populate({
      path: "course",
      select:
        "title thumbnail price level category instructor totalLectures totalDuration isFree",
      populate: { path: "instructor", select: "fullName email" },
    })
    .populate("lastWatchedLecture", "title order")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      enrollments,
      total: enrollments.length,
    })
  );
});


// ─── UPDATE PROGRESS ───────────────────────────────────────────────────────────
//
// Marks a lecture as completed and recalculates overall course progress.
// For free courses: auto-enrolls the student if not already enrolled.
// For paid courses: requires an existing enrollment.
//
export const updateProgress = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;
  const { lectureId } = req.body;

  if (!lectureId) throw new ApiError(400, "Lecture ID is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  let enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });

  if (!enrollment) {
    if (course.isFree) {
      // Auto-enroll on first progress update for free courses
      enrollment = await autoEnrollFreeCourse(
        req.user._id,
        courseId,
        course.title,
        req.user.email,
        req.user.fullName
      );
    } else {
      throw new ApiError(
        403,
        "Please enroll in this course to track progress"
      );
    }
  }

  const alreadyCompleted = enrollment.completedLectures.some(
    (id) => id.toString() === lectureId.toString()
  );

  if (!alreadyCompleted) {
    enrollment.completedLectures.push(lectureId);
  }

  enrollment.lastWatchedLecture = lectureId;

  const totalLectures = await Lecture.countDocuments({
    course: courseId,
    isPublished: true,
  });

  if (totalLectures > 0) {
    enrollment.progress = Math.round(
      (enrollment.completedLectures.length / totalLectures) * 100
    );
  }

  if (enrollment.progress === 100) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();

  return res.status(200).json(
    new ApiResponse(200, {
      progress: enrollment.progress,
      completedLectures: enrollment.completedLectures.length,
      totalLectures,
      isCompleted: enrollment.progress === 100,
    })
  );
});


// ─── GET COURSE ENROLLMENTS (Instructor) ───────────────────────────────────────
export const getCourseEnrollments = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this course's enrollments");
  }

  const enrollments = await Enrollment.find({
    course: courseId,
    isActive: true,
  })
    .populate("user", "fullName email")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      enrollments,
      total: enrollments.length,
    })
  );
});


// ─── REVOKE ENROLLMENT ─────────────────────────────────────────────────────────
export const revokeEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { enrollmentId } = req.params;

  const enrollment = await Enrollment.findById(enrollmentId).populate({
    path: "course",
    select: "instructor title",
  });

  if (!enrollment) throw new ApiError(404, "Enrollment not found");

  if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to revoke this enrollment");
  }

  enrollment.isActive = false;
  await enrollment.save();

  await Course.findByIdAndUpdate(enrollment.course._id, {
    $inc: { totalEnrollments: -1 },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Enrollment revoked successfully"));
});


// ─── RESTORE ENROLLMENT ────────────────────────────────────────────────────────
export const restoreEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { enrollmentId } = req.params;

  const enrollment = await Enrollment.findById(enrollmentId).populate({
    path: "course",
    select: "instructor title",
  });

  if (!enrollment) throw new ApiError(404, "Enrollment not found");

  if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to restore this enrollment");
  }

  if (enrollment.isActive) {
    throw new ApiError(400, "Enrollment is already active");
  }

  enrollment.isActive = true;
  await enrollment.save();

  await Course.findByIdAndUpdate(enrollment.course._id, {
    $inc: { totalEnrollments: 1 },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Enrollment restored successfully"));
});
