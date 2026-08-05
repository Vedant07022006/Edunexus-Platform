import { Router } from "express";
import {
  createComment,
  getLectureComments,
  deleteComment,
} from "../controllers/discussion.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/lecture/:lectureId", verifyJWT, getLectureComments);
router.post("/lecture/:lectureId", verifyJWT, createComment);
router.delete("/:commentId", verifyJWT, deleteComment);

export default router;