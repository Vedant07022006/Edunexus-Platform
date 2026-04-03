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


router.get("/course/:courseId", optionalAuth , getCourseLectures);


// PROTECTED ROUTES — login required

router.get("/:lectureId", verifyJWT, getLectureById);


// INSTRUCTOR ROUTES — instructor only

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

export default router;