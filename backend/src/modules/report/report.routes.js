import { Router } from "express";
import { createReport, getMyReports, resolveReport } from "./report.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import { isInstructor } from "../../middlewares/role.middleware.js";

const router = Router();

router.post("/", verifyJWT, createReport);
router.get("/mine", verifyJWT, isInstructor, getMyReports);
router.patch("/:reportId", verifyJWT, isInstructor, resolveReport);

export default router;
