import { Router } from "express";
import {
  enrollFreeCourse,
  checkEnrollment,
  getMyEnrollments,
  getMyPurchases,
  updateProgress,
  updateLastWatchedPosition,
  getCourseEnrollments,
  revokeEnrollment,
  restoreEnrollment,
} from "../controllers/enrollment.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor, isStudent } from "../middlewares/role.middleware.js";

const router = Router();

// STUDENT ROUTES
router.post("/enroll/:courseId",   verifyJWT, isStudent, enrollFreeCourse);
router.get("/check/:courseId",     verifyJWT, checkEnrollment);
router.get("/my-enrollments",      verifyJWT, isStudent, getMyEnrollments);
router.get("/my-purchases",        verifyJWT, isStudent, getMyPurchases);   // NEW
router.patch("/progress/:courseId", verifyJWT, isStudent, updateProgress);
router.patch("/position/:courseId", verifyJWT, isStudent, updateLastWatchedPosition); // NEW

// INSTRUCTOR ROUTES
router.get("/course/:courseId",          verifyJWT, isInstructor, getCourseEnrollments);
router.patch("/revoke/:enrollmentId",    verifyJWT, isInstructor, revokeEnrollment);
router.patch("/restore/:enrollmentId",   verifyJWT, isInstructor, restoreEnrollment);

export default router;