import { Router } from "express";
import { getRevenueStats, getRevenueCourses } from "../controllers/revenue.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";

const router = Router();

// All revenue routes are instructor-only
router.use(verifyJWT, isInstructor);

router.get("/stats",   getRevenueStats);
router.get("/courses", getRevenueCourses);

export default router;