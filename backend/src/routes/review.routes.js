import { Router } from "express";
import {
  createOrUpdateReview,
  getCourseReviews,
  getMyReviewForCourse,
  deleteReview,
} from "../controllers/review.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isStudent } from "../middlewares/role.middleware.js";

const router = Router();

// PUBLIC — anyone can read a course's reviews
router.get("/course/:courseId", getCourseReviews);

// STUDENT ROUTES
router.get("/course/:courseId/mine", verifyJWT, isStudent, getMyReviewForCourse);
router.post("/course/:courseId", verifyJWT, isStudent, createOrUpdateReview);
router.delete("/course/:courseId", verifyJWT, isStudent, deleteReview);

export default router;