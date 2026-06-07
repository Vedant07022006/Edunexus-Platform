import { Router } from "express";
import {
  addLecture,
  updateLecture,
  deleteLecture,
  getCourseLectures,
  getLectureById,
  getInstructorLectures,
} from "../controllers/lecture.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { uploadVideo } from "../middlewares/multer.middleware.js";

const router = Router();

// PUBLIC — students can view course lectures (gated by enrollment in controller)
router.get("/course/:courseId", optionalAuth, getCourseLectures);

// INSTRUCTOR ROUTES — must be defined BEFORE /:lectureId to prevent
// Express from matching "instructor" as a lectureId parameter
router.post(
  "/course/:courseId",
  verifyJWT,
  isInstructor,
  uploadVideo,
  addLecture
);
router.get(
  "/instructor/course/:courseId",
  verifyJWT,
  isInstructor,
  getInstructorLectures
);
router.patch(
  "/:lectureId",
  verifyJWT,
  isInstructor,
  uploadVideo,
  updateLecture
);
router.delete("/:lectureId", verifyJWT, isInstructor, deleteLecture);

// PROTECTED ROUTES — login required (MUST come after /instructor/course/:courseId)
router.get("/:lectureId", verifyJWT, getLectureById);

export default router;