import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Report } from "./report.model.js";
import { Course } from "../course/course.model.js";

export const createReport = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { targetType, targetId, courseId, reason } = req.body;
  if (!targetType || !targetId || !courseId || !reason) {
    throw new ApiError(400, "targetType, targetId, courseId, and reason are required");
  }
  if (!["lecture", "comment"].includes(targetType)) {
    throw new ApiError(400, "Invalid target type");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    course: courseId,
    reason: reason.trim(),
  });

  return res.status(201).json(new ApiResponse(201, report, "Report submitted"));
});

// Instructor's moderation queue — reports for courses they own
export const getMyReports = asyncHandler(async (req, res) => {
  const myCourses = await Course.find({ instructor: req.user._id }).select("_id");
  const courseIds = myCourses.map((c) => c._id);

  const reports = await Report.find({ course: { $in: courseIds }, status: "pending" })
    .populate("reporter", "fullName")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, { reports, total: reports.length }));
});

export const resolveReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body; // "reviewed" | "dismissed"

  if (!["reviewed", "dismissed"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const report = await Report.findById(reportId).populate("course", "instructor");
  if (!report) throw new ApiError(404, "Report not found");
  if (report.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  report.status = status;
  await report.save();

  return res.status(200).json(new ApiResponse(200, report, "Report updated"));
});
