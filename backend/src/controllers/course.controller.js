// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Course } from "../models/course.model.js";
// import { User } from "../models/user.model.js";
// import {
//   uploadThumbnailOnCloudinary,
//   deleteFromCloudinary,
// } from "../utils/cloudinary.js";


// // CREATE COURSE — Instructor only

// export const createCourse = asyncHandler(async (req, res) => {
//   const { title, description, price, category, level, language, tags } = req.body;

//   if (!title || !description || !category) {
//     throw new ApiError(400, "Title, description and category are required");
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
//     tags: tags ? tags.split(",").map((t) => t.trim()) : [],
//   });

//   await User.findByIdAndUpdate(req.user._id, {
//     $push: { createdCourses: course._id },
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, course, "Course created successfully"));
// });


// // UPDATE COURSE — Instructor only (own course)

// export const updateCourse = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;
//   const { title, description, price, category, level, language, tags } = req.body;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to update this course");
//   }

//   if (req.file) {
//     if (course.thumbnail.publicId) {
//       await deleteFromCloudinary(course.thumbnail.publicId, "image");
//     }
//     const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
//     if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
//     course.thumbnail = { url: uploaded.secure_url, publicId: uploaded.public_id };
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
//   if (tags) course.tags = tags.split(",").map((t) => t.trim());

//   await course.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, course, "Course updated successfully"));
// });


// // DELETE COURSE — Instructor only (own course)

// export const deleteCourse = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

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


// // PUBLISH COURSE — Instructor only (own course)

// export const publishCourse = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to publish this course");
//   }

//   course.isPublished = !course.isPublished;
//   await course.save();

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { isPublished: course.isPublished },
//       course.isPublished ? "Course published successfully" : "Course unpublished successfully"
//     )
//   );
// });


// // GET ALL COURSES — Everyone (no login needed)

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

//   const courses = await Course.find({ isPublished: true, isArchived: false })
//     .populate("instructor", "fullName email")
//     .select("-__v")
//     .sort(sortOptions[sort] || sortOptions.newest)
//     .skip(skip)
//     .limit(Number(limit));

//   const total = await Course.countDocuments({ isPublished: true, isArchived: false });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         courses,
//         pagination: {
//           total,
//           page: Number(page),
//           limit: Number(limit),
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//       "Courses fetched successfully"
//     )
//   );
// });


// // GET COURSE BY ID — Everyone (no login needed)

// export const getCourseById = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const course = await Course.findOne({ _id: courseId, isArchived: false })
//     .populate("instructor", "fullName email bio")
//     .select("-__v");

//   if (!course) throw new ApiError(404, "Course not found");

  
//   if (!course.isPublished) {
//     if (!req.user || course.instructor._id.toString() !== req.user._id.toString()) {
//       throw new ApiError(404, "Course not found");
//     }
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, course, "Course fetched successfully"));
// });


// // GET MY COURSES — Instructor only

// export const getMyCourses = asyncHandler(async (req, res) => {
//   const courses = await Course.find({ instructor: req.user._id, isArchived: false })
//     .populate("instructor", "fullName email bio")
//     .select("-__v")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(200, { courses, total: courses.length }, "Your courses fetched successfully")
//   );
// });


// // SEARCH COURSES — Everyone (no login needed)

// export const searchCourses = asyncHandler(async (req, res) => {
//   const { q } = req.query;

//   if (!q) throw new ApiError(400, "Search query is required");

//   // ✅ Escape regex special characters to prevent ReDoS attack
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

//   return res.status(200).json(
//     new ApiResponse(200, { courses, total: courses.length }, "Courses fetched successfully")
//   );
// });


// // GET COURSES BY CATEGORY — Everyone (no login needed)

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

//   return res.status(200).json(
//     new ApiResponse(200, { courses, total: courses.length }, `Courses in ${category} fetched successfully`)
//   );
// });










import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import {
  uploadThumbnailOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// ================= CREATE COURSE =================
export const createCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const { title, description, price, category, level, language, tags } = req.body;

  if (!title || !description || !category) {
    throw new ApiError(400, "Title, description and category are required");
  }

  if (price && Number(price) < 0) {
    throw new ApiError(400, "Price cannot be negative");
  }

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
    price: Number(price) || 0,
    isFree: !price || Number(price) === 0,
    thumbnail,
    category,
    level: level || "beginner",
    language: language || "English",
    tags: Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(",").map((t) => t.trim())
      : [],
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { createdCourses: course._id },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, course, "Course created successfully"));
});

// ================= UPDATE COURSE =================
export const updateCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const { courseId } = req.params;
  const { title, description, price, category, level, language, tags } = req.body;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this course");
  }

  if (price !== undefined && Number(price) < 0) {
    throw new ApiError(400, "Price cannot be negative");
  }

  if (req.file) {
    if (course.thumbnail.publicId) {
      await deleteFromCloudinary(course.thumbnail.publicId, "image");
    }
    const uploaded = await uploadThumbnailOnCloudinary(req.file.path);
    if (!uploaded) throw new ApiError(500, "Failed to upload thumbnail");
    course.thumbnail = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  if (title) course.title = title;
  if (description) course.description = description;

  if (price !== undefined) {
    course.price = Number(price);
    course.isFree = Number(price) === 0;
  }

  if (category) course.category = category;
  if (level) course.level = level;
  if (language) course.language = language;

  if (tags) {
    course.tags = Array.isArray(tags)
      ? tags
      : tags.split(",").map((t) => t.trim());
  }

  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course updated successfully"));
});

// ================= DELETE COURSE =================
export const deleteCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this course");
  }

  if (course.thumbnail.publicId) {
    await deleteFromCloudinary(course.thumbnail.publicId, "image");
  }

  course.isArchived = true;
  await course.save();

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { createdCourses: course._id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Course deleted successfully"));
});

// ================= RESTORE COURSE =================
export const restoreCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to restore this course");
  }

  if (!course.isArchived) {
    throw new ApiError(400, "Course is not deleted");
  }

  course.isArchived = false;
  await course.save();

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { createdCourses: course._id }, // $addToSet avoids duplicates
  });

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course restored successfully"));
});

// ================= PUBLISH COURSE =================
export const publishCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to publish this course");
  }

  course.isPublished = !course.isPublished;
  await course.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { isPublished: course.isPublished },
      course.isPublished
        ? "Course published successfully"
        : "Course unpublished successfully"
    )
  );
});

// ================= GET ALL COURSES =================
export const getAllCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = "newest" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    popular: { totalEnrollments: -1 },
    price_low: { price: 1 },
    price_high: { price: -1 },
  };

  const courses = await Course.find({
    isPublished: true,
    isArchived: false,
  })
    .populate("instructor", "fullName email")
    .select("-__v")
    .sort(sortOptions[sort] || sortOptions.newest)
    .skip(skip)
    .limit(Number(limit));

  const total = await Course.countDocuments({
    isPublished: true,
    isArchived: false,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        courses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      "Courses fetched successfully"
    )
  );
});

// ================= GET COURSE BY ID =================
export const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findOne({
    _id: courseId,
    isArchived: false,
  })
    .populate("instructor", "fullName email bio")
    .select("-__v");

  if (!course) throw new ApiError(404, "Course not found");

  const isInstructor =
    req.user &&
    course.instructor._id.toString() === req.user._id.toString();

  if (!course.isPublished && !isInstructor) {
    throw new ApiError(404, "Course not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course fetched successfully"));
});

// ================= GET MY COURSES =================
export const getMyCourses = asyncHandler(async (req, res) => {
  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Only instructors allowed");
  }

  const courses = await Course.find({
    instructor: req.user._id,
    isArchived: false,
  })
    .populate("instructor", "fullName email bio")
    .select("-__v")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      { courses, total: courses.length },
      "Your courses fetched successfully"
    )
  );
});

// ================= SEARCH COURSES =================
export const searchCourses = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) throw new ApiError(400, "Search query is required");

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const courses = await Course.find({
    isPublished: true,
    isArchived: false,
    $or: [
      { title: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
    ],
  })
    .populate("instructor", "fullName email")
    .select("-__v")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      { courses, total: courses.length },
      "Courses fetched successfully"
    )
  );
});

// ================= GET COURSES BY CATEGORY =================
export const getCoursesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const courses = await Course.find({
    category: { $regex: escaped, $options: "i" },
    isPublished: true,
    isArchived: false,
  })
    .populate("instructor", "fullName email")
    .select("-__v")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      { courses, total: courses.length },
      `Courses in ${category} fetched successfully`
    )
  );
});

