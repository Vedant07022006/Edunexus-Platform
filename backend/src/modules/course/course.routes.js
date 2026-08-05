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
  getMyArchivedCourses,
  searchCourses,
  getCoursesByCategory,
  generateCourseAiAssist,
  getCourseAnalytics,
} from "./course.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import optionalAuth from "../../middlewares/optionalAuth.middleware.js";
import { isInstructor } from "../../middlewares/role.middleware.js";
import { uploadThumbnail } from "../../middlewares/multer.middleware.js";

const router = Router();

// ── PUBLIC ROUTES — no auth needed ─────────────────────────────────────────
router.get("/", getAllCourses);
router.get("/search", searchCourses);
router.get("/category/:category", getCoursesByCategory);

// ── INSTRUCTOR ROUTES — static paths MUST come before /:courseId ──────────
// /my/courses must be before /:courseId or Express treats "my" as a courseId
router.get("/my/courses", verifyJWT, isInstructor, getMyCourses);
router.get("/my/archived", verifyJWT, isInstructor, getMyArchivedCourses);
router.post("/ai-assist", verifyJWT, isInstructor, generateCourseAiAssist); // NEW — Phase 2

router.post("/", verifyJWT, isInstructor, uploadThumbnail, createCourse);
router.patch("/:courseId/publish", verifyJWT, isInstructor, publishCourse);
router.patch("/:courseId/restore", verifyJWT, isInstructor, restoreCourse);
router.get("/:courseId/analytics", verifyJWT, isInstructor, getCourseAnalytics); // NEW — Phase 4
router.patch("/:courseId", verifyJWT, isInstructor, uploadThumbnail, updateCourse);
router.delete("/:courseId", verifyJWT, isInstructor, deleteCourse);

// ── DYNAMIC ROUTE — optionalAuth lets instructors view their unpublished courses ──
// Without optionalAuth, req.user is always null → isInstructor = false → 404 on
// every unpublished course, breaking ManageCoursePage completely.
router.get("/:courseId", optionalAuth, getCourseById);

export default router;
