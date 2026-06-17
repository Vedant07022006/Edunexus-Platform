// import mongoose from "mongoose";
// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Course } from "../models/course.model.js";
// import { User } from "../models/user.model.js";
// import { Enrollment } from "../models/enrollment.model.js";
// import {
//   uploadThumbnailOnCloudinary,
//   deleteFromCloudinary,
// } from "../utils/cloudinary.js";




// export const createCourse = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { title, description, price, category, level, language, tags } = req.body;

//   if (!title || !description || !category) {
//     throw new ApiError(400, "Title, description and category are required");
//   }

//   if (price && Number(price) < 0) {
//     throw new ApiError(400, "Price cannot be negative");
//   }

//   let thumbnail = { url: "", publicId: "" };
//   if (req.file) {
//     const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
//     if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
//     thumbnail = { url: uploaded.secure_url, publicId: uploaded.public_id };
//   }

//   const course = await Course.create({
//     title,
//     description,
//     instructor: req.user._id,
//     price: Number(price) || 0,
//     isFree: !price || Number(price) === 0,
//     thumbnail,
//     category,
//     level: level || "beginner",
//     language: language || "English",
//     tags: Array.isArray(tags)
//       ? tags
//       : tags
//       ? tags.split(",").map((t) => t.trim())
//       : [],
//   });

//   await User.findByIdAndUpdate(req.user._id, {
//     $push: { createdCourses: course._id },
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, course, "Course created successfully"));
// });





// const validateObjectId = (id, name = "Resource") => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new ApiError(400, `Invalid ${name} ID format`);
//   }
// };

// export const updateCourse = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { courseId } = req.params;
//   validateObjectId(courseId, "Course");
//   const { title, description, price, category, level, language, tags } = req.body;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");
//   if (!course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to update this course");
//   }

//   if (price !== undefined && Number(price) < 0) {
//     throw new ApiError(400, "Price cannot be negative");
//   }

//   if (req.file) {
//     if (course.thumbnail.publicId) {
//       await deleteFromCloudinary(course.thumbnail.publicId, "image");
//     }
//     const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
//     if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
//     course.thumbnail = {
//       url: uploaded.secure_url,
//       publicId: uploaded.public_id,
//     };
//   }

//   if (title) course.title = title;
//   if (description) course.description = description;

//   if (price !== undefined) {
//     course.price = Number(price);
//     course.isFree = Number(price) === 0;
//   }

//   if (category) course.category = category;
//   if (level) course.level = level;
//   if (language) course.language = language;

//   if (tags) {
//     course.tags = Array.isArray(tags)
//       ? tags
//       : tags.split(",").map((t) => t.trim());
//   }

//   await course.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, course, "Course updated successfully"));
// });




// export const deleteCourse = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { courseId } = req.params;
//   validateObjectId(courseId, "Course");

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");
//   if (!course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to delete this course");
//   }

//   if (course.thumbnail.publicId) {
//     await deleteFromCloudinary(course.thumbnail.publicId, "image");
//   }

//   course.isArchived = true;
//   await course.save();

//   await User.findByIdAndUpdate(req.user._id, {
//     $pull: { createdCourses: course._id },
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Course deleted successfully"));
// });





// export const restoreCourse = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { courseId } = req.params;
//   validateObjectId(courseId, "Course");

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");
//   if (!course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to restore this course");
//   }

//   if (!course.isArchived) {
//     throw new ApiError(400, "Course is not deleted");
//   }

//   course.isArchived = false;
//   await course.save();

//   await User.findByIdAndUpdate(req.user._id, {
//     $addToSet: { createdCourses: course._id }, // $addToSet avoids duplicates
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, course, "Course restored successfully"));
// });

// // ================= PUBLISH COURSE =================
// export const publishCourse = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { courseId } = req.params;
//   validateObjectId(courseId, "Course");

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");
//   if (!course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to publish this course");
//   }

//   course.isPublished = !course.isPublished;
//   await course.save();

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { isPublished: course.isPublished },
//       course.isPublished
//         ? "Course published successfully"
//         : "Course unpublished successfully"
//     )
//   );
// });

// // ================= GET ALL COURSES =================
// export const getAllCourses = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, sort = "newest" } = req.query;

//   const skip = (Number(page) - 1) * Number(limit);

//   const sortOptions = {
//     newest: { createdAt: -1 },
//     oldest: { createdAt: 1 },
//     popular: { totalEnrollments: -1 },
//     price_low: { price: 1 },
//     price_high: { price: -1 },
//   };

//   const courses = await Course.find({
//     isPublished: true,
//     isArchived: false,
//   })
//     .populate("instructor", "fullName email")
//     .select("-__v")
//     .sort(sortOptions[sort] || sortOptions.newest)
//     .skip(skip)
//     .limit(Number(limit));

//   // Filter out courses where instructor was permanently deleted
//   const validCourses = courses.filter((c) => c.instructor !== null);

//   const total = await Course.countDocuments({
//     isPublished: true,
//     isArchived: false,
//   });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         courses: validCourses,
//         pagination: {
//           total,
//           page: Number(page),
//           limit: Number(limit),
//           totalPages: Math.ceil(total / Number(limit)),
//         },
//       },
//       "Courses fetched successfully"
//     )
//   );
// });

// // ================= GET COURSE BY ID =================
// export const getCourseById = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;
//   validateObjectId(courseId, "Course");

//   const course = await Course.findById(courseId)
//     .populate("instructor", "fullName email bio")
//     .select("-__v");

//   if (!course) throw new ApiError(404, "Course not found");

//   const isInstructor =
//     req.user &&
//     course.instructor &&
//     course.instructor._id.toString() === req.user._id.toString();

//   // If instructor was permanently deleted, treat course as unavailable
//   if (!course.instructor) {
//     if (req.user) {
//       const enrollment = await Enrollment.findOne({
//         user: req.user._id,
//         course: courseId,
//         isActive: true,
//       });
//       if (!enrollment) {
//         throw new ApiError(404, "This course is no longer available");
//       }
//     } else {
//       throw new ApiError(404, "This course is no longer available");
//     }
//   }

//   // If course is archived, only allow access to enrolled students or the instructor
//   if (course.isArchived) {
//     if (!isInstructor) {
//       if (req.user) {
//         const enrollment = await Enrollment.findOne({
//           user: req.user._id,
//           course: courseId,
//           isActive: true,
//         });
//         if (!enrollment) {
//           throw new ApiError(404, "This course is no longer available");
//         }
//       } else {
//         throw new ApiError(404, "This course is no longer available");
//       }
//     }
//   }

//   if (!course.isPublished && !isInstructor && !course.isArchived) {
//     throw new ApiError(404, "Course not found");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, course, "Course fetched successfully"));
// });

// // ================= GET MY COURSES =================
// export const getMyCourses = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const courses = await Course.find({
//     instructor: req.user._id,
//     isArchived: false,
//   })
//     .populate("instructor", "fullName email bio")
//     .select("-__v")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { courses, total: courses.length },
//       "Your courses fetched successfully"
//     )
//   );
// });

// // ================= SEARCH COURSES =================
// export const searchCourses = asyncHandler(async (req, res) => {
//   const { q } = req.query;

//   if (!q) throw new ApiError(400, "Search query is required");

//   const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//   const courses = await Course.find({
//     isPublished: true,
//     isArchived: false,
//     $or: [
//       { title: { $regex: escaped, $options: "i" } },
//       { description: { $regex: escaped, $options: "i" } },
//       { tags: { $regex: escaped, $options: "i" } },
//       { category: { $regex: escaped, $options: "i" } },
//     ],
//   })
//     .populate("instructor", "fullName email")
//     .select("-__v")
//     .sort({ createdAt: -1 });

//   // Filter out courses where instructor was permanently deleted
//   const validCourses = courses.filter((c) => c.instructor !== null);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { courses: validCourses, total: validCourses.length },
//       "Courses fetched successfully"
//     )
//   );
// });

// // ================= GET COURSES BY CATEGORY =================
// export const getCoursesByCategory = asyncHandler(async (req, res) => {
//   const { category } = req.params;

//   const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//   const courses = await Course.find({
//     category: { $regex: escaped, $options: "i" },
//     isPublished: true,
//     isArchived: false,
//   })
//     .populate("instructor", "fullName email")
//     .select("-__v")
//     .sort({ createdAt: -1 });

//   // Filter out courses where instructor was permanently deleted
//   const validCourses = courses.filter((c) => c.instructor !== null);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { courses: validCourses, total: validCourses.length },
//       `Courses in ${category} fetched successfully`
//     )
//   );
// });







import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Lecture } from "../models/lecture.model.js";
import { uploadThumbnailOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const validateObjectId = (id, name = "Resource") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${name} ID format`);
  }
};

const parseTags = (tags) => {
  if (!tags) return [];
  return Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
};

/**
 * Finds a course by ID, verifies ownership, and optionally checks that
 * the instructor still exists in the DB.
 */
const getOwnedCourse = async (courseId, instructorId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "You are not authorized to modify this course");
  }
  return course;
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const createCourse = asyncHandler(async (req, res) => {
  const { title, description, price, category, level, language, tags } = req.body;

  if (!title || !description || !category) {
    throw new ApiError(400, "Title, description and category are required");
  }

  const parsedPrice = Number(price) || 0;
  if (parsedPrice < 0) throw new ApiError(400, "Price cannot be negative");

  let thumbnail = { url: "", publicId: "" };
  if (req.file) {
    const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
    if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
    thumbnail = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  const course = await Course.create({
    title,
    description,
    instructor: req.user._id,
    price: parsedPrice,
    isFree: parsedPrice === 0,
    thumbnail,
    category,
    level: level || "beginner",
    language: language || "English",
    tags: parseTags(tags),
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { createdCourses: course._id },
  });

  return res.status(201).json(new ApiResponse(201, course, "Course created successfully"));
});


export const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  validateObjectId(courseId, "Course");

  const course = await getOwnedCourse(courseId, req.user._id);

  const { title, description, price, category, level, language, tags } = req.body;

  if (price !== undefined && Number(price) < 0) {
    throw new ApiError(400, "Price cannot be negative");
  }

  if (req.file) {
    if (course.thumbnail.publicId) await deleteFromCloudinary(course.thumbnail.publicId, "image");
    const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
    if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
    course.thumbnail = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  if (title) course.title = title;
  if (description) course.description = description;
  if (category) course.category = category;
  if (level) course.level = level;
  if (language) course.language = language;
  if (tags) course.tags = parseTags(tags);

  if (price !== undefined) {
    course.price = Number(price);
    course.isFree = Number(price) === 0;
  }

  await course.save();

  return res.status(200).json(new ApiResponse(200, course, "Course updated successfully"));
});


export const deleteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  validateObjectId(courseId, "Course");

  const course = await getOwnedCourse(courseId, req.user._id);

  if (course.thumbnail.publicId) await deleteFromCloudinary(course.thumbnail.publicId, "image");

  course.isArchived = true;
  await course.save();

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { createdCourses: course._id },
  });

  return res.status(200).json(new ApiResponse(200, null, "Course deleted successfully"));
});


export const restoreCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  validateObjectId(courseId, "Course");

  const course = await getOwnedCourse(courseId, req.user._id);

  if (!course.isArchived) throw new ApiError(400, "Course is not deleted");

  course.isArchived = false;
  await course.save();

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { createdCourses: course._id },
  });

  return res.status(200).json(new ApiResponse(200, course, "Course restored successfully"));
});


export const publishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  validateObjectId(courseId, "Course");

  const course = await getOwnedCourse(courseId, req.user._id);

  course.isPublished = !course.isPublished;
  await course.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { isPublished: course.isPublished },
      course.isPublished ? "Course published successfully" : "Course unpublished successfully"
    )
  );
});


const SORT_OPTIONS = {
  newest:     { createdAt: -1 },
  oldest:     { createdAt: 1 },
  popular:    { totalEnrollments: -1 },
  price_low:  { price: 1 },
  price_high: { price: -1 },
};

export const getAllCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = "newest" } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = { isPublished: true, isArchived: false };

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate("instructor", "fullName email")
      .select("-__v")
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(limitNum),
    Course.countDocuments(filter),
  ]);

  const validCourses = courses.filter((c) => c.instructor !== null);

  return res.status(200).json(
    new ApiResponse(200, {
      courses: validCourses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }, "Courses fetched successfully")
  );
});


export const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  validateObjectId(courseId, "Course");

  const course = await Course.findById(courseId)
    .populate("instructor", "fullName email bio")
    .select("-__v");

  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");

  const isInstructor =
    req.user && course.instructor._id.toString() === req.user._id.toString();

  if (course.isArchived && !isInstructor) {
    const enrollment = req.user
      ? await Enrollment.findOne({ user: req.user._id, course: courseId, isActive: true })
      : null;

    if (!enrollment) throw new ApiError(404, "This course is no longer available");
  }

  if (!course.isPublished && !isInstructor && !course.isArchived) {
    throw new ApiError(404, "Course not found");
  }

  return res.status(200).json(new ApiResponse(200, course, "Course fetched successfully"));
});


export const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id, isArchived: false })
    .populate("instructor", "fullName email bio")
    .select("-__v")
    .sort({ createdAt: -1 });

  // BUGFIX: course.totalLectures is a manually-maintained counter that can
  // drift out of sync (e.g. if a lecture is ever deleted directly in the DB
  // instead of through the API). Always compute the live count from the
  // Lecture collection so the dashboard never shows a stale number.
  const liveCounts = await Lecture.aggregate([
    { $match: { course: { $in: courses.map((c) => c._id) } } },
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(liveCounts.map((c) => [c._id.toString(), c.count]));

  const coursesWithLiveCount = courses.map((course) => {
    const obj = course.toObject();
    obj.totalLectures = countMap.get(course._id.toString()) || 0;
    return obj;
  });

  return res.status(200).json(
    new ApiResponse(200, { courses: coursesWithLiveCount, total: coursesWithLiveCount.length }, "Your courses fetched successfully")
  );
});


// NEW: Instructor's archived (soft-deleted) courses, so they can review and
// restore them from the dashboard instead of the data being invisible forever.
export const getMyArchivedCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id, isArchived: true })
    .populate("instructor", "fullName email bio")
    .select("-__v")
    .sort({ updatedAt: -1 });

  const liveCounts = await Lecture.aggregate([
    { $match: { course: { $in: courses.map((c) => c._id) } } },
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(liveCounts.map((c) => [c._id.toString(), c.count]));

  const coursesWithLiveCount = courses.map((course) => {
    const obj = course.toObject();
    obj.totalLectures = countMap.get(course._id.toString()) || 0;
    return obj;
  });

  return res.status(200).json(
    new ApiResponse(200, { courses: coursesWithLiveCount, total: coursesWithLiveCount.length }, "Archived courses fetched successfully")
  );
});


const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchCourses = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, "Search query is required");

  const regex = { $regex: escapeRegex(q), $options: "i" };

  const courses = await Course.find({
    isPublished: true,
    isArchived: false,
    $or: [{ title: regex }, { description: regex }, { tags: regex }, { category: regex }],
  })
    .populate("instructor", "fullName email")
    .select("-__v")
    .sort({ createdAt: -1 });

  const validCourses = courses.filter((c) => c.instructor !== null);

  return res.status(200).json(
    new ApiResponse(200, { courses: validCourses, total: validCourses.length }, "Courses fetched successfully")
  );
});


export const getCoursesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const regex = { $regex: escapeRegex(category), $options: "i" };

  const courses = await Course.find({
    category: regex,
    isPublished: true,
    isArchived: false,
  })
    .populate("instructor", "fullName email")
    .select("-__v")
    .sort({ createdAt: -1 });

  const validCourses = courses.filter((c) => c.instructor !== null);

  return res.status(200).json(
    new ApiResponse(200, { courses: validCourses, total: validCourses.length }, `Courses in ${category} fetched successfully`)
  );
});