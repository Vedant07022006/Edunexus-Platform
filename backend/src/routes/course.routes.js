import { Router } from "express";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  restoreCourse,
  publishCourse,
  getAllCourses,
  getCourseById,
  getMyCourses,
  searchCourses,
  getCoursesByCategory,
} from "../controllers/course.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { uploadThumbnail } from "../middlewares/multer.middleware.js";

const router = Router();


// PUBLIC ROUTES — no login needed

router.get("/", getAllCourses);
router.get("/search", searchCourses);
router.get("/category/:category", getCoursesByCategory);


// PROTECTED ROUTES — Instructor only

router.post("/", verifyJWT, isInstructor, uploadThumbnail, createCourse);
router.patch("/:courseId/publish", verifyJWT, isInstructor, publishCourse);
router.patch("/:courseId", verifyJWT, isInstructor, uploadThumbnail, updateCourse);
router.delete("/:courseId", verifyJWT, isInstructor, deleteCourse);
router.patch("/:courseId/restore", verifyJWT, isInstructor, restoreCourse);
// ⚠️ /my/courses MUST be above /:courseId to avoid Express treating "my" as an ID
router.get("/my/courses", verifyJWT, isInstructor, getMyCourses);


router.get("/:courseId", getCourseById);

export default router;