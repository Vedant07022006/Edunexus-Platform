import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getCoursePayments,
  razorpayWebhook,
  refundPayment,
  createBundleOrder,
  verifyBundlePayment,
} from "./payment.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import { isInstructor, isStudent } from "../../middlewares/role.middleware.js";

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

// Bundle checkout
router.post("/bundle/create-order/:bundleId", verifyJWT, isStudent, createBundleOrder);
router.post("/bundle/verify", verifyJWT, isStudent, verifyBundlePayment);


// INSTRUCTOR ROUTES

router.get(
  "/course/:courseId",
  verifyJWT,
  isInstructor,
  getCoursePayments
);

// Refund
router.post("/refund/:paymentId", verifyJWT, isInstructor, refundPayment);

export default router;
