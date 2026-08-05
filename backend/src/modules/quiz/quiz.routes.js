import { Router } from "express";
import {
  generateQuiz,
  getQuizByLecture,
  regenerateQuiz,
  deleteQuiz,
  createManualQuiz,
  updateManualQuiz,
  getAiQuota,
} from "./quiz.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import optionalAuth from "../../middlewares/optionalAuth.middleware.js";
import { isInstructor } from "../../middlewares/role.middleware.js";

const router = Router();


// INSTRUCTOR ROUTES

router.post(
  "/generate/:lectureId",
  verifyJWT,
  isInstructor,
  generateQuiz
);
router.post(
  "/regenerate/:lectureId",
  verifyJWT,
  isInstructor,
  regenerateQuiz
);

// NEW: manual quiz creation / edit — no AI, no daily limit
router.post(
  "/manual/:lectureId",
  verifyJWT,
  isInstructor,
  createManualQuiz
);
router.patch(
  "/manual/:lectureId",
  verifyJWT,
  isInstructor,
  updateManualQuiz
);

// NEW: check today's AI generation usage for a course
router.get(
  "/ai-quota/:courseId",
  verifyJWT,
  isInstructor,
  getAiQuota
);

router.delete(
  "/:lectureId",
  verifyJWT,
  isInstructor,
  deleteQuiz
);


// STUDENT + INSTRUCTOR ROUTES

router.get("/:lectureId", optionalAuth, getQuizByLecture);

export default router;
