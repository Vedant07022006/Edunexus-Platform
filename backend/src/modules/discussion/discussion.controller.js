import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Discussion } from "./discussion.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";

// Shared access check — mirrors getTranscriptForViewer's rule:
// instructor, free course, or an actively enrolled student.
const assertLectureAccess = async (lectureId, user) => {
  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course?.instructor) throw new ApiError(404, "This course is no longer available");

  const isInstructor = course.instructor.toString() === user._id.toString();

  if (!isInstructor && !course.isFree && !lecture.isFree) {
    const enrollment = await Enrollment.findOne({
      user: user._id,
      course: course._id,
      isActive: true,
    });
    if (!enrollment) throw new ApiError(403, "Enroll to join this lecture's discussion");
  }

  return { lecture, course, isInstructor };
};

export const createComment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;
  const { text, parentComment } = req.body;

  if (!text || !text.trim()) throw new ApiError(400, "Comment text is required");

  const { course, isInstructor } = await assertLectureAccess(lectureId, req.user);

  if (parentComment) {
    const parent = await Discussion.findById(parentComment);
    if (!parent || parent.lecture.toString() !== lectureId) {
      throw new ApiError(404, "Parent comment not found");
    }
  }

  const comment = await Discussion.create({
    lecture: lectureId,
    course: course._id,
    user: req.user._id,
    text: text.trim(),
    parentComment: parentComment || null,
    isInstructorReply: isInstructor,
  });

  const populated = await comment.populate("user", "fullName role");

  return res.status(201).json(new ApiResponse(201, populated, "Comment posted"));
});

export const getLectureComments = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;
  await assertLectureAccess(lectureId, req.user);

  const comments = await Discussion.find({ lecture: lectureId })
    .populate("user", "fullName role")
    .sort({ createdAt: 1 });

  return res.status(200).json(new ApiResponse(200, { comments, total: comments.length }));
});

export const deleteComment = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { commentId } = req.params;
  const comment = await Discussion.findById(commentId).populate({
    path: "course",
    select: "instructor",
  });
  if (!comment) throw new ApiError(404, "Comment not found");

  const isOwner = comment.user.toString() === req.user._id.toString();
  const isInstructor = comment.course?.instructor?.toString() === req.user._id.toString();

  if (!isOwner && !isInstructor) {
    throw new ApiError(403, "Not authorized to delete this comment");
  }

  // Also remove any direct replies to keep the thread coherent
  await Discussion.deleteMany({ parentComment: commentId });
  await Discussion.findByIdAndDelete(commentId);

  return res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
});
