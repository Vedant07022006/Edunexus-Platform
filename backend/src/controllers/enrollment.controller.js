import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Lecture } from "../models/lecture.model.js";
import { sendEnrollmentEmail, sendInstructorEnrollmentEmail } from "../utils/email.js";
import { Payment } from "../models/payment.model.js";


const autoEnrollFreeCourse = async (userId, courseId, courseName, userEmail, userName) => {
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

  await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });

  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledCourses: { course: courseId, enrolledAt: new Date() } },
  });

  try {
    await sendEnrollmentEmail(userEmail, { studentName: userName, courseName });
  } catch (err) {
    console.error("Enrollment email failed:", err.message);
  }

  return enrollment;
};


export const enrollFreeCourse = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");
  if (req.user.role !== "student") throw new ApiError(403, "Only students can enroll");

  const { courseId } = req.params;

  const course = await Course.findById(courseId).populate("instructor", "fullName email");
  if (!course) throw new ApiError(404, "Course not found");
  if (course.isArchived) throw new ApiError(400, "This course is no longer available for enrollment");
  if (!course.isPublished) throw new ApiError(400, "This course is not published yet");
  if (!course.isFree) throw new ApiError(400, "This is a paid course. Please purchase it to enroll.");
  if (!course.instructor) throw new ApiError(400, "This course is no longer available for enrollment");

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });
  if (existingEnrollment) throw new ApiError(400, "You are already enrolled in this course");

  const enrollment = await autoEnrollFreeCourse(
    req.user._id,
    courseId,
    course.title,
    req.user.email,
    req.user.fullName
  );

  // Notify instructor
  try {
    await sendInstructorEnrollmentEmail(course.instructor.email, {
      instructorName: course.instructor.fullName,
      studentName:    req.user.fullName,
      courseName:     course.title,
      amount:         0,
      enrolledAt:     new Date(),
    });
  } catch (err) {
    console.error("Instructor notification email failed:", err.message);
  }

  return res.status(201).json(new ApiResponse(201, enrollment, "Enrolled successfully"));
});


export const checkEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;

  const course = await Course.findById(courseId).select("instructor");
  if (!course || !course.instructor) {
    return res.status(200).json(
      new ApiResponse(200, {
        isEnrolled: false,
        enrollment: null,
        message: "This course is no longer available",
      })
    );
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  }).populate("lastWatchedLecture", "_id title order");

  return res.status(200).json(
    new ApiResponse(200, { isEnrolled: !!enrollment, enrollment: enrollment || null })
  );
});


export const getMyEnrollments = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");
  if (req.user.role !== "student") throw new ApiError(403, "Only students can view enrollments");

  const enrollments = await Enrollment.find({ user: req.user._id, isActive: true })
    .populate({
      path: "course",
      select: "title thumbnail price level category instructor totalLectures totalDuration isFree",
      populate: { path: "instructor", select: "fullName email" },
    })
    .populate("lastWatchedLecture", "title order")
    .sort({ createdAt: -1 });

  const validEnrollments = enrollments.filter((e) => e.course && e.course.instructor);

  return res.status(200).json(
    new ApiResponse(200, { enrollments: validEnrollments, total: validEnrollments.length })
  );
});


// ─── Student purchases page — paginated enrollments with payment info ──────────
export const getMyPurchases = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");
  if (req.user.role !== "student") throw new ApiError(403, "Only students allowed");

  const { page = 1, limit = 6, search = "", filter = "all", sort = "newest" } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(20, Math.max(1, Number(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const enrollmentFilter = { user: req.user._id, isActive: true };

  let enrollments = await Enrollment.find(enrollmentFilter)
    .populate({
      path: "course",
      select: "title thumbnail price isFree instructor totalLectures",
      populate: { path: "instructor", select: "fullName" },
    })
    .sort({ createdAt: sort === "oldest" ? 1 : -1 });

  // Filter out deleted courses
  enrollments = enrollments.filter((e) => e.course && e.course.instructor);

  // Search
  if (search) {
    const q = search.toLowerCase();
    enrollments = enrollments.filter((e) => e.course.title.toLowerCase().includes(q));
  }

  // Filter by paid/free
  if (filter === "paid") enrollments = enrollments.filter((e) => !e.course.isFree);
  if (filter === "free") enrollments = enrollments.filter((e) => e.course.isFree);

  const total    = enrollments.length;
  const paginated = enrollments.slice(skip, skip + limitNum);

  // Stats
  const payments = await Payment.find({ user: req.user._id, status: "completed" }).select("amount");
  const totalSpent  = payments.reduce((s, p) => s + p.amount, 0);
  const freeCount   = enrollments.filter((e) => e.course.isFree).length;

  return res.status(200).json(
    new ApiResponse(200, {
      enrollments: paginated,
      stats: {
        totalSpent,
        totalEnrolled: total,
        freeCount,
      },
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});


export const updateProgress = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;
  const { lectureId } = req.body;
  if (!lectureId) throw new ApiError(400, "Lecture ID is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  let enrollment = await Enrollment.findOne({ user: req.user._id, course: courseId, isActive: true });

  if (!enrollment) {
    if (course.isFree) {
      const instructorExists = await User.findById(course.instructor);
      if (!instructorExists) throw new ApiError(400, "This course is no longer available");
      enrollment = await autoEnrollFreeCourse(
        req.user._id, courseId, course.title, req.user.email, req.user.fullName
      );
    } else {
      throw new ApiError(403, "Please enroll in this course to track progress");
    }
  }

  const alreadyCompleted = enrollment.completedLectures.some(
    (id) => id.toString() === lectureId.toString()
  );
  if (!alreadyCompleted) enrollment.completedLectures.push(lectureId);
  enrollment.lastWatchedLecture = lectureId;

  const totalLectures = await Lecture.countDocuments({ course: courseId, isPublished: true });
  if (totalLectures > 0) {
    enrollment.progress = Math.round((enrollment.completedLectures.length / totalLectures) * 100);
  }
  if (enrollment.progress === 100) enrollment.completedAt = new Date();

  await enrollment.save();

  return res.status(200).json(
    new ApiResponse(200, {
      progress:           enrollment.progress,
      completedLectures:  enrollment.completedLectures.length,
      totalLectures,
      isCompleted:        enrollment.progress === 100,
    })
  );
});


// NEW: lightweight playback-position heartbeat. Deliberately separate from
// updateProgress — this is called every few seconds while a video plays, so
// it must NEVER touch completedLectures/progress (that would prematurely
// mark a lecture "completed" a few seconds into playback and break quiz
// eligibility gating). It only records where to resume from.
// NEW — Phase 3: updates the user's daily learning streak. Only writes
// when the calendar day actually changed, so this stays cheap even
// though it's called from a frequently-hit endpoint.
const updateLearningStreak = async (userId) => {
  const { User } = await import("../models/user.model.js");
  const user = await User.findById(userId).select("currentStreak longestStreak lastActiveDate");
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  if (last && last.getTime() === today.getTime()) return; // already counted today

  const oneDayMs = 24 * 60 * 60 * 1000;
  const isConsecutive = last && today.getTime() - last.getTime() === oneDayMs;

  user.currentStreak = isConsecutive ? user.currentStreak + 1 : 1;
  user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
  user.lastActiveDate = today;
  await user.save();
};


export const updateLastWatchedPosition = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;
  const { lectureId, seconds } = req.body;

  if (!lectureId) throw new ApiError(400, "Lecture ID is required");

  const parsedSeconds = Number(seconds);
  if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
    throw new ApiError(400, "seconds must be a non-negative number");
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });

  // No-op if not enrolled (e.g. instructor preview, or free-course viewer
  // who hasn't auto-enrolled yet) — position tracking is a nice-to-have,
  // not something worth erroring the player over.
  if (!enrollment) {
    return res.status(200).json(new ApiResponse(200, null, "Not enrolled — position not saved"));
  }

  enrollment.lastWatchedLecture = lectureId;
  enrollment.lastWatchedSeconds = Math.floor(parsedSeconds);
  await enrollment.save();

  // NEW — Phase 3: bump the user's daily learning streak. Cheap
  // date-only comparison, only writes when the day has actually changed.
  await updateLearningStreak(req.user._id);

  return res.status(200).json(new ApiResponse(200, null, "Position saved"));
});


export const getCourseEnrollments = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this course's enrollments");
  }

  const enrollments = await Enrollment.find({ course: courseId, isActive: true })
    .populate("user", "fullName email")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { enrollments, total: enrollments.length })
  );
});


export const revokeEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { enrollmentId } = req.params;
  const enrollment = await Enrollment.findById(enrollmentId).populate({
    path: "course",
    select: "instructor title",
  });

  if (!enrollment) throw new ApiError(404, "Enrollment not found");
  if (!enrollment.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to revoke this enrollment");
  }

  enrollment.isActive = false;
  await enrollment.save();
  await Course.findByIdAndUpdate(enrollment.course._id, { $inc: { totalEnrollments: -1 } });

  return res.status(200).json(new ApiResponse(200, null, "Enrollment revoked successfully"));
});


export const restoreEnrollment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { enrollmentId } = req.params;
  const enrollment = await Enrollment.findById(enrollmentId).populate({
    path: "course",
    select: "instructor title",
  });

  if (!enrollment) throw new ApiError(404, "Enrollment not found");
  if (!enrollment.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to restore this enrollment");
  }
  if (enrollment.isActive) throw new ApiError(400, "Enrollment is already active");

  enrollment.isActive = true;
  await enrollment.save();
  await Course.findByIdAndUpdate(enrollment.course._id, { $inc: { totalEnrollments: 1 } });

  return res.status(200).json(new ApiResponse(200, null, "Enrollment restored successfully"));
});