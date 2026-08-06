import { Lecture } from "./lecture.model.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Finds a lecture by ID, verifies that the caller is the owning instructor,
 * and returns the populated lecture document.
 *
 * @param {string|ObjectId} lectureId    - Lecture's _id
 * @param {string|ObjectId} instructorId - Authenticated user's _id
 * @returns {Promise<Lecture>}           - Populated lecture (with .course)
 * @throws {ApiError} 404 if not found / course deleted
 * @throws {ApiError} 403 if not the owner
 */
export const getOwnedLecture = async (lectureId, instructorId) => {
  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");
  if (!lecture.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (lecture.course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "Not authorized to modify this lecture");
  }
  return lecture;
};
