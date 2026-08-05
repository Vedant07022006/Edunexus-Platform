import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Course } from "./course.model.js";
import { User } from "../user/user.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import { uploadThumbnailOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import Groq from "groq-sdk"; // NEW — Phase 2: AI-assisted course description/tags
import mongoose from "mongoose";
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

// ─── AI-assist helpers (NEW — Phase 2) ─────────────────────────────────────────

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const parseAiAssistResponse = (raw) => {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(500, "AI returned invalid content. Please try again or write it manually.");
  }
  if (
    !parsed ||
    typeof parsed.description !== "string" ||
    !Array.isArray(parsed.tags)
  ) {
    throw new ApiError(500, "AI did not return a valid description/tags pair. Please try again.");
  }
  return {
    description: parsed.description.trim(),
    tags: parsed.tags
      .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
      .filter(Boolean)
      .slice(0, 8),
  };
};

const buildAiAssistPrompt = (title, notes) => `
You are helping an instructor draft their online course listing.

Course title: "${title}"
Instructor's rough notes on what the course covers: "${notes || "(none provided — infer from the title)"}"

Write:
1. A polished, engaging 2-4 sentence course description suitable for a course marketplace listing.
2. 5 to 8 relevant lowercase tags (single words or short phrases) for search/discovery.

Rules:
- Return ONLY a JSON object, nothing else — no markdown, no preamble.
- Format exactly: {"description": "...", "tags": ["tag1", "tag2", ...]}
- The description should sound professional and appealing to prospective students, not generic filler.
`.trim();

// ─── Controllers ───────────────────────────────────────────────────────────────

// NEW — Phase 2: stateless AI-assist endpoint. Returns a draft
// description + tags for the instructor to review/edit before creating
// the course — nothing is saved here.
export const generateCourseAiAssist = asyncHandler(async (req, res) => {
  const { title, notes } = req.body;

  if (!title || title.trim().length < 5) {
    throw new ApiError(400, "Provide a course title (at least 5 characters) first");
  }

  const groq = getGroqClient();

  const callAi = async () => {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: buildAiAssistPrompt(title.trim(), notes?.trim()) }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 400,
    });
    const text = completion.choices[0]?.message?.content || "";
    return parseAiAssistResponse(text);
  };

  let result;
  try {
    result = await callAi();
  } catch {
    result = await callAi(); // one retry, matching the other AI-generation patterns
  }

  return res.status(200).json(new ApiResponse(200, result, "Draft generated"));
});


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

  const courseIds = courses.map((c) => c._id);

  // Dynamically compute live counts from Lecture and Enrollment collections
  // to ensure dashboard counters never drift out of sync with real data.
  const [liveLectureCounts, liveEnrollmentCounts] = await Promise.all([
    Lecture.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, isActive: true } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
  ]);

  const lectureCountMap = new Map(liveLectureCounts.map((c) => [c._id.toString(), c.count]));
  const enrollmentCountMap = new Map(liveEnrollmentCounts.map((c) => [c._id.toString(), c.count]));

  const coursesWithLiveCount = courses.map((course) => {
    const obj = course.toObject();
    obj.totalLectures = lectureCountMap.get(course._id.toString()) || 0;
    obj.totalEnrollments = enrollmentCountMap.get(course._id.toString()) || 0;
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


// NEW — Phase 4: instructor analytics — completion rate, avg quiz score,
// per-lecture drop-off. Read-only aggregation, no writes.
export const getCourseAnalytics = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { Enrollment: EnrollmentModel } = await import("../enrollment/enrollment.model.js");
  const { QuizAttempt } = await import("../quiz/quizAttempt.model.js");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const lectures = await Lecture.find({ course: courseId }).select("_id title order").sort({ order: 1 });
  const enrollments = await EnrollmentModel.find({ course: courseId, isActive: true });

  const totalStudents = enrollments.length;
  const completedCount = enrollments.filter((e) => e.progress === 100).length;
  const completionRate = totalStudents ? Math.round((completedCount / totalStudents) * 100) : 0;
  const avgProgress = totalStudents
    ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / totalStudents)
    : 0;

  // Per-lecture drop-off: % of enrolled students who have completed each lecture
  const dropOff = lectures.map((lec) => {
    const reached = enrollments.filter((e) =>
      e.completedLectures.some((id) => id.toString() === lec._id.toString())
    ).length;
    return {
      lectureId: lec._id,
      title: lec.title,
      order: lec.order,
      studentsReached: reached,
      reachedPercent: totalStudents ? Math.round((reached / totalStudents) * 100) : 0,
    };
  });

  const quizAttempts = await QuizAttempt.find({ course: courseId });
  const avgQuizScore = quizAttempts.length
    ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length)
    : null;

  return res.status(200).json(
    new ApiResponse(200, {
      totalStudents,
      completedCount,
      completionRate,
      avgProgress,
      avgQuizScore,
      totalQuizAttempts: quizAttempts.length,
      dropOff,
    })
  );
});
