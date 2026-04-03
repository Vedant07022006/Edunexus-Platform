import { Router } from "express";
import {
  generateQuiz,
  getQuizByLecture,
  regenerateQuiz,
  deleteQuiz,
} from "../controllers/quiz.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";

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
router.delete(
  "/:lectureId",
  verifyJWT,
  isInstructor,
  deleteQuiz
);


// STUDENT + INSTRUCTOR ROUTES

router.get("/:lectureId", verifyJWT, getQuizByLecture);

export default router;