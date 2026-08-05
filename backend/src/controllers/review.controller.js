import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Review } from "../models/review.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Recomputes a course's aggregate rating (average + total count) from its
 * Review documents. Called after every create/update/delete so
 * Course.rating always stays in sync.
 */
const recalculateCourseRating = async (courseId) => {
  const stats = await Review.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    { $group: { _id: "$course", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const { avg = 0, count = 0 } = stats[0] || {};

  await Course.findByIdAndUpdate(courseId, {
    "rating.average": Math.round(avg * 10) / 10,
    "rating.totalRatings": count,
  });
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const createOrUpdateReview = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");
  if (req.user.role !== "student") throw new ApiError(403, "Only students can review courses");

  const { courseId } = req.params;
  const { rating, comment } = req.body;

  const parsedRating = Number(rating);
  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });
  if (!enrollment) throw new ApiError(403, "Enroll in this course before reviewing it");

  const review = await Review.findOneAndUpdate(
    { course: courseId, user: req.user._id },
    { rating: parsedRating, comment: comment?.trim() || "" },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );

  await recalculateCourseRating(courseId);

  return res.status(200).json(new ApiResponse(200, review, "Review saved successfully"));
});


export const getCourseReviews = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    Review.find({ course: courseId })
      .populate("user", "fullName")
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Review.countDocuments({ course: courseId }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});


export const getMyReviewForCourse = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;
  const review = await Review.findOne({ course: courseId, user: req.user._id });

  return res.status(200).json(new ApiResponse(200, { review: review || null }));
});


export const deleteReview = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { courseId } = req.params;

  const review = await Review.findOneAndDelete({ course: courseId, user: req.user._id });
  if (!review) throw new ApiError(404, "Review not found");

  await recalculateCourseRating(courseId);

  return res.status(200).json(new ApiResponse(200, null, "Review deleted"));
});