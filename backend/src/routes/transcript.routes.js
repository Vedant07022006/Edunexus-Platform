import { Router } from "express";
import {
  generateTranscript,
  getTranscript,
  deleteTranscript,
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
router.get("/:lectureId", verifyJWT, isInstructor, getTranscript);
router.delete("/:lectureId", verifyJWT, isInstructor, deleteTranscript);

export default router;