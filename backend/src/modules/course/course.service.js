import { Course } from "./course.model.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Finds a course by ID, verifies that the caller is the owning instructor,
 * and returns the course document.
 *
 * @param {string|ObjectId} courseId     - Course's _id
 * @param {string|ObjectId} instructorId - Authenticated user's _id
 * @returns {Promise<Course>}            - The course document
 * @throws {ApiError} 404 if not found / instructor deleted
 * @throws {ApiError} 403 if not the owner
 */
export const getOwnedCourse = async (courseId, instructorId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "You are not authorized to modify this course");
  }
  return course;
};
