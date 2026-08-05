import { Router } from "express";
import {
  generateTranscript,
  getTranscript,
  deleteTranscript,
  getTranscriptForViewer,
  generateSummary,
} from "../controllers/transcript.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";

const router = Router();


router.post(
  "/generate/:lectureId",
  verifyJWT,
  isInstructor,
  generateTranscript
);

// NEW — Phase 2: instructor-triggered summary generation
router.post(
  "/generate-summary/:lectureId",
  verifyJWT,
  isInstructor,
  generateSummary
);

// NEW: viewer-facing endpoint (students/enrolled users) — must come before
// the instructor-only "/:lectureId" route below only for readability;
// Express won't confuse the two since "/:lectureId/view" has an extra path
// segment and can never match "/:lectureId".
router.get("/:lectureId/view", verifyJWT, getTranscriptForViewer);

router.get("/:lectureId", verifyJWT, isInstructor, getTranscript);
router.delete("/:lectureId", verifyJWT, isInstructor, deleteTranscript);

export default router;