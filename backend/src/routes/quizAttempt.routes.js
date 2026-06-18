import { Router } from "express";
import {
  checkEligibility,
  submitQuiz,
  getMyAttempts,
  getBestScore,
  getLeaderboard,
  getAttemptDetails,
} from "../controllers/quizAttempt.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isStudent } from "../middlewares/role.middleware.js";

const router = Router();


// STUDENT ROUTES

router.get(
  "/eligibility/:lectureId",
  verifyJWT,
  isStudent,
  checkEligibility
);
router.post(
  "/submit/:lectureId",
  verifyJWT,
  isStudent,
  submitQuiz
);
router.get(
  "/my-attempts/:lectureId",
  verifyJWT,
  isStudent,
  getMyAttempts
);
router.get(
  "/best-score/:lectureId",
  verifyJWT,
  isStudent,
  getBestScore
);
router.get(
  "/attempt/:attemptId",
  verifyJWT,
  isStudent,
  getAttemptDetails
);


// ALL LOGGED IN USERS

router.get(
  "/leaderboard/:courseId",
  verifyJWT,
  getLeaderboard
);

export default router;