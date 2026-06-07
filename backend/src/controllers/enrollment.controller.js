// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Enrollment } from "../models/enrollment.model.js";
// import { Course } from "../models/course.model.js";
// import { User } from "../models/user.model.js";
// import { Lecture } from "../models/lecture.model.js";
// import { sendEnrollmentEmail } from "../utils/email.js";




// const autoEnrollFreeCourse = async (
//   userId,
//   courseId,
//   courseName,
//   userEmail,
//   userName
// ) => {
//   const existing = await Enrollment.findOne({ user: userId, course: courseId });

//   if (existing) {
//     if (!existing.isActive) {
//       existing.isActive = true;
//       await existing.save();
//     }
//     return existing;
//   }

//   const enrollment = await Enrollment.create({
//     user: userId,
//     course: courseId,
//     isActive: true,
//     progress: 0,
//   });

//   await Course.findByIdAndUpdate(courseId, {
//     $inc: { totalEnrollments: 1 },
//   });

 
//   await User.findByIdAndUpdate(userId, {
//     $addToSet: {
//       enrolledCourses: { course: courseId, enrolledAt: new Date() },
//     },
//   });

//   try {
//     await sendEnrollmentEmail(userEmail, {
//       studentName: userName,
//       courseName,
//     });
//   } catch (err) {
//     console.error("Auto-enrollment email failed:", err.message);
//   }

//   return enrollment;
// };



// export const enrollFreeCourse = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   if (req.user.role !== "student") {
//     throw new ApiError(403, "Only students can enroll in courses");
//   }

//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   if (course.isArchived) {
//     throw new ApiError(400, "This course is no longer available for enrollment");
//   }

//   if (!course.isPublished) {
//     throw new ApiError(400, "This course is not published yet");
//   }

//   if (!course.isFree) {
//     throw new ApiError(
//       400,
//       "This is a paid course. Please purchase it to enroll."
//     );
//   }

//   const instructorExists = await User.findById(course.instructor);
//   if (!instructorExists) {
//     throw new ApiError(400, "This course is no longer available for enrollment");
//   }

//   const existingEnrollment = await Enrollment.findOne({
//     user: req.user._id,
//     course: courseId,
//     isActive: true,
//   });

//   if (existingEnrollment) {
//     throw new ApiError(400, "You are already enrolled in this course");
//   }

//   const enrollment = await autoEnrollFreeCourse(
//     req.user._id,
//     courseId,
//     course.title,
//     req.user.email,
//     req.user.fullName
//   );

//   return res
//     .status(201)
//     .json(new ApiResponse(201, enrollment, "Enrolled successfully"));
// });



// export const checkEnrollment = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   const { courseId } = req.params;

//   const course = await Course.findById(courseId).select("instructor");
//   if (!course || !course.instructor) {
//     return res.status(200).json(
//       new ApiResponse(200, {
//         isEnrolled: false,
//         enrollment: null,
//         message: "This course is no longer available",
//       })
//     );
//   }

//   const enrollment = await Enrollment.findOne({
//     user: req.user._id,
//     course: courseId,
//     isActive: true,
//   });

//   const validEnrollments = enrollments.filter(
//     (e) => e.course && e.course.instructor
//   );

//   return res.status(200).json(
//     new ApiResponse(200, {
//       enrollments: validEnrollments,
//       total: validEnrollments.length,
//     })
//   );
// });



// export const getMyEnrollments = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   if (req.user.role !== "student") {
//     throw new ApiError(403, "Only students can view enrollments");
//   }

//   const enrollments = await Enrollment.find({
//     user: req.user._id,
//     isActive: true,
//   })
//     .populate({
//       path: "course",
//       select:
//         "title thumbnail price level category instructor totalLectures totalDuration isFree",
//       populate: { path: "instructor", select: "fullName email" },
//     })
//     .populate("lastWatchedLecture", "title order")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(200, {
//       enrollments,
//       total: enrollments.length,
//     })
//   );
// });



// export const updateProgress = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   const { courseId } = req.params;
//   const { lectureId } = req.body;

//   if (!lectureId) throw new ApiError(400, "Lecture ID is required");

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   let enrollment = await Enrollment.findOne({
//     user: req.user._id,
//     course: courseId,
//     isActive: true,
//   });

//   if (!enrollment) {
//     if (course.isFree) {
//       const instructorExists = await User.findById(course.instructor);
//       if (!instructorExists) {
//         throw new ApiError(400, "This course is no longer available");
//       }

      
//       enrollment = await autoEnrollFreeCourse(
//         req.user._id,
//         courseId,
//         course.title,
//         req.user.email,
//         req.user.fullName
//       );
//     } else {
//       throw new ApiError(
//         403,
//         "Please enroll in this course to track progress"
//       );
//     }
//   }

//   const alreadyCompleted = enrollment.completedLectures.some(
//     (id) => id.toString() === lectureId.toString()
//   );

//   if (!alreadyCompleted) {
//     enrollment.completedLectures.push(lectureId);
//   }

//   enrollment.lastWatchedLecture = lectureId;

//   const totalLectures = await Lecture.countDocuments({
//     course: courseId,
//     isPublished: true,
//   });

//   if (totalLectures > 0) {
//     enrollment.progress = Math.round(
//       (enrollment.completedLectures.length / totalLectures) * 100
//     );
//   }

//   if (enrollment.progress === 100) {
//     enrollment.completedAt = new Date();
//   }

//   await enrollment.save();

//   return res.status(200).json(
//     new ApiResponse(200, {
//       progress: enrollment.progress,
//       completedLectures: enrollment.completedLectures.length,
//       totalLectures,
//       isCompleted: enrollment.progress === 100,
//     })
//   );
// });



// export const getCourseEnrollments = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");
//   if (!course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized to view this course's enrollments");
//   }

//   const enrollments = await Enrollment.find({
//     course: courseId,
//     isActive: true,
//   })
//     .populate("user", "fullName email")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(200, {
//       enrollments,
//       total: enrollments.length,
//     })
//   );
// });



// export const revokeEnrollment = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   const { enrollmentId } = req.params;

//   const enrollment = await Enrollment.findById(enrollmentId).populate({
//     path: "course",
//     select: "instructor title",
//   });

//   if (!enrollment) throw new ApiError(404, "Enrollment not found");
//   if (!enrollment.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized to revoke this enrollment");
//   }

//   enrollment.isActive = false;
//   await enrollment.save();

//   await Course.findByIdAndUpdate(enrollment.course._id, {
//     $inc: { totalEnrollments: -1 },
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Enrollment revoked successfully"));
// });



// export const restoreEnrollment = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   const { enrollmentId } = req.params;

//   const enrollment = await Enrollment.findById(enrollmentId).populate({
//     path: "course",
//     select: "instructor title",
//   });

//   if (!enrollment) throw new ApiError(404, "Enrollment not found");
//   if (!enrollment.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (enrollment.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized to restore this enrollment");
//   }

//   if (enrollment.isActive) {
//     throw new ApiError(400, "Enrollment is already active");
//   }

//   enrollment.isActive = true;
//   await enrollment.save();

//   await Course.findByIdAndUpdate(enrollment.course._id, {
//     $inc: { totalEnrollments: 1 },
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Enrollment restored successfully"));
// });













import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Lecture } from "../models/lecture.model.js";
import { sendEnrollmentEmail } from "../utils/email.js";

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Creates (or reactivates) a free-course enrollment and sends a confirmation
 * email. Returns the enrollment document.
 */
const createFreeEnrollment = async (userId, courseId, courseName, userEmail, userName) => {
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

  await Promise.all([
    Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } }),
    User.findByIdAndUpdate(userId, {
      $addToSet: { enrolledCourses: { course: courseId, enrolledAt: new Date() } },
    }),
  ]);

  try {
    await sendEnrollmentEmail(userEmail, { studentName: userName, courseName });
  } catch (err) {
    console.error("Enrollment email failed:", err.message);
  }

  return enrollment;
};

/**
 * Verifies a course exists, has a valid instructor, and is accessible.
 * Throws ApiError on any failure. Returns the course document.
 */
const getAccessibleCourse = async (courseId, { requirePublished = false } = {}) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (requirePublished && !course.isPublished) throw new ApiError(400, "This course is not published yet");
  if (requirePublished && course.isArchived) throw new ApiError(400, "This course is no longer available for enrollment");
  return course;
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const enrollFreeCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await getAccessibleCourse(courseId, { requirePublished: true });

  if (!course.isFree) {
    throw new ApiError(400, "This is a paid course. Please purchase it to enroll.");
  }

  const instructorExists = await User.findById(course.instructor);
  if (!instructorExists) throw new ApiError(400, "This course is no longer available for enrollment");

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });
  if (existingEnrollment) throw new ApiError(400, "You are already enrolled in this course");

  const enrollment = await createFreeEnrollment(
    req.user._id,
    courseId,
    course.title,
    req.user.email,
    req.user.fullName
  );

  return res.status(201).json(new ApiResponse(201, enrollment, "Enrolled successfully"));
});


export const checkEnrollment = asyncHandler(async (req, res) => {
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
    new ApiResponse(200, {
      isEnrolled: !!enrollment,
      enrollment: enrollment || null,
    })
  );
});


export const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    user: req.user._id,
    isActive: true,
  })
    .populate({
      path: "course",
      select: "title thumbnail price level category instructor totalLectures totalDuration isFree",
      populate: { path: "instructor", select: "fullName email" },
    })
    .populate("lastWatchedLecture", "title order")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { enrollments, total: enrollments.length })
  );
});


export const updateProgress = asyncHandler(async (req, res) => {
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
    if (!course.isFree) throw new ApiError(403, "Please enroll in this course to track progress");

    const instructorExists = await User.findById(course.instructor);
    if (!instructorExists) throw new ApiError(400, "This course is no longer available");

    enrollment = await createFreeEnrollment(
      req.user._id,
      courseId,
      course.title,
      req.user.email,
      req.user.fullName
    );
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
      progress: enrollment.progress,
      completedLectures: enrollment.completedLectures.length,
      totalLectures,
      isCompleted: enrollment.progress === 100,
    })
  );
});


export const getCourseEnrollments = asyncHandler(async (req, res) => {
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