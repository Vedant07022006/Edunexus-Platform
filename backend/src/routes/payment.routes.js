import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getCoursePayments,
  razorpayWebhook,
} from "../controllers/payment.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isInstructor, isStudent } from "../middlewares/role.middleware.js";

const router = Router();

// WEBHOOK
router.post("/webhook", razorpayWebhook);


// STUDENT ROUTES

router.post(
  "/create-order/:courseId",
  verifyJWT,
  isStudent,
  createOrder
);
router.post(
  "/verify",
  verifyJWT,
  isStudent,
  verifyPayment
);
router.get(
  "/history",
  verifyJWT,
  isStudent,
  getPaymentHistory
);


// INSTRUCTOR ROUTES

router.get(
  "/course/:courseId",
  verifyJWT,
  isInstructor,
  getCoursePayments
);

export default router;