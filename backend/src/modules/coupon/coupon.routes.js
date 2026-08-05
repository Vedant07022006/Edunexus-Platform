import { Router } from "express";
import {
  createCoupon,
  getCourseCoupons,
  deleteCoupon,
  validateCoupon,
} from "./coupon.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import { isInstructor, isStudent } from "../../middlewares/role.middleware.js";

const router = Router();

// INSTRUCTOR
router.post("/course/:courseId", verifyJWT, isInstructor, createCoupon);
router.get("/course/:courseId", verifyJWT, isInstructor, getCourseCoupons);
router.delete("/:couponId", verifyJWT, isInstructor, deleteCoupon);

// STUDENT
router.post("/course/:courseId/validate", verifyJWT, isStudent, validateCoupon);

export default router;
