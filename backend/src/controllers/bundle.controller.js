import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Bundle } from "../models/bundle.model.js";
import { Course } from "../models/course.model.js";

export const createBundle = asyncHandler(async (req, res) => {
  const { title, description, courseIds, price } = req.body;

  if (!title || !Array.isArray(courseIds) || courseIds.length < 2 || !price) {
    throw new ApiError(400, "Title, at least 2 courses, and a price are required");
  }

  const courses = await Course.find({ _id: { $in: courseIds }, instructor: req.user._id });
  if (courses.length !== courseIds.length) {
    throw new ApiError(400, "One or more courses are invalid or not owned by you");
  }

  const bundle = await Bundle.create({
    title,
    description: description || "",
    instructor: req.user._id,
    courses: courseIds,
    price: Number(price),
  });

  return res.status(201).json(new ApiResponse(201, bundle, "Bundle created"));
});

export const getMyBundles = asyncHandler(async (req, res) => {
  const bundles = await Bundle.find({ instructor: req.user._id })
    .populate("courses", "title thumbnail price")
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { bundles }));
});

export const publishBundle = asyncHandler(async (req, res) => {
  const { bundleId } = req.params;
  const bundle = await Bundle.findById(bundleId);
  if (!bundle) throw new ApiError(404, "Bundle not found");
  if (bundle.instructor.toString() !== req.user._id.toString()) throw new ApiError(403, "Not authorized");

  bundle.isPublished = !bundle.isPublished;
  await bundle.save();
  return res.status(200).json(new ApiResponse(200, bundle, `Bundle ${bundle.isPublished ? "published" : "unpublished"}`));
});

export const getBundleById = asyncHandler(async (req, res) => {
  const { bundleId } = req.params;
  const bundle = await Bundle.findById(bundleId)
    .populate("courses", "title thumbnail price rating")
    .populate("instructor", "fullName");
  if (!bundle || !bundle.isPublished) throw new ApiError(404, "Bundle not found");
  return res.status(200).json(new ApiResponse(200, bundle));
});

export const getAllBundles = asyncHandler(async (req, res) => {
  const bundles = await Bundle.find({ isPublished: true })
    .populate("courses", "title thumbnail")
    .populate("instructor", "fullName")
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { bundles }));
});