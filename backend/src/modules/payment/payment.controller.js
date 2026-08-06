import Razorpay from "razorpay";
import crypto from "crypto";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Payment } from "./payment.model.js";
import { Course } from "../course/course.model.js";
import { Bundle } from "../bundle/bundle.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { User } from "../user/user.model.js";
import { Coupon } from "../coupon/coupon.model.js";
import { sendRefundEmail } from "../../utils/email.js";
import { createEnrollment } from "../../services/enrollment.service.js";
import logger from "../../utils/logger.js";

// ─── Razorpay lazy instance ────────────────────────────────────────────────────
// Initialized on first use (not at import time) so that dotenv has already
// loaded process.env by the time the constructor runs.

let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, "Razorpay credentials are not configured in .env");
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};




// ─── POST /api/v1/payments/create-order/:courseId ──────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { couponCode } = req.body;

  const course = await Course.findById(courseId).populate("instructor", "fullName email");
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.isArchived) throw new ApiError(400, "This course is no longer available for purchase");
  if (!course.isPublished) throw new ApiError(400, "This course is not published yet");
  if (course.isFree) throw new ApiError(400, "This course is free — enroll directly");

  // Check if already enrolled
  const alreadyEnrolled = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });
  if (alreadyEnrolled) throw new ApiError(400, "You are already enrolled in this course");

  let amount = course.price;
  let appliedCoupon = null;

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      course: courseId,
      isActive: true,
    });

    if (!coupon) throw new ApiError(400, "Invalid or expired coupon code");
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new ApiError(400, "This coupon has expired");
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new ApiError(400, "This coupon has reached its usage limit");
    }

    amount = Math.round(amount * (1 - coupon.discountPercent / 100));
    appliedCoupon = coupon;
  }

  const amountInPaise = Math.round(amount * 100);

  const razorpayOrder = await getRazorpay().orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `order_${Date.now()}`,
  });

  // Save pending payment record
  const payment = await Payment.create({
    user:             req.user._id,
    course:           courseId,
    razorpayOrderId:  razorpayOrder.id,
    amount,
    currency:         "INR",
    status:           "pending",
    couponCode:       appliedCoupon ? appliedCoupon.code : null,
    originalAmount:   appliedCoupon ? course.price : null,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      orderId:      razorpayOrder.id,
      amount:       razorpayOrder.amount,
      currency:     razorpayOrder.currency,
      paymentId:    payment._id,
      keyId:        process.env.RAZORPAY_KEY_ID,
      courseName:   course.title,
      coursePrice:  course.price,
      discountApplied: appliedCoupon ? appliedCoupon.discountPercent : 0,
    }, "Order created successfully")
  );
});

// ─── POST /api/v1/payments/verify ─────────────────────────────────────────────

export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment verification fields");
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw new ApiError(404, "Payment record not found");

  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status            = "completed";
  await payment.save();

  // Mark coupon used
  if (payment.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: payment.couponCode, course: payment.course },
      { $inc: { usedCount: 1 } }
    );
  }

  const course = await Course.findById(payment.course).populate("instructor", "fullName email");
  if (course && !payment.enrollmentCreated) {
    await createEnrollment({
      userId:       payment.user,
      courseId:     payment.course,
      courseName:   course.title,
      userEmail:    req.user.email,
      userName:     req.user.fullName,
      instructorId: course.instructor?._id,
      instructorContact: course.instructor
        ? { email: course.instructor.email, fullName: course.instructor.fullName }
        : undefined,
    });
    payment.enrollmentCreated = true;
    await payment.save();
  }

  return res.status(200).json(
    new ApiResponse(200, { payment }, "Payment verified and enrollment created")
  );
});

// ─── GET /api/v1/payments/history ─────────────────────────────────────────────

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id, status: "completed" })
    .populate("course", "title thumbnail price")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { payments, total: payments.length }, "Payment history fetched")
  );
});

// ─── GET /api/v1/payments/course/:courseId ────────────────────────────────────

export const getCoursePayments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view payments for this course");
  }

  const payments = await Payment.find({ course: courseId, status: "completed" })
    .populate("user", "fullName email")
    .sort({ createdAt: -1 });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  return res.status(200).json(
    new ApiResponse(200, { payments, total: payments.length, totalRevenue }, "Course payments fetched")
  );
});

// ─── POST /api/v1/payments/webhook ────────────────────────────────────────────

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("RAZORPAY_WEBHOOK_SECRET not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const signature = req.headers["x-razorpay-signature"];
  const body      = req.rawBody || JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body;

  if (event.event === "payment.captured") {
    const { order_id, id: paymentId, method } = event.payload.payment.entity;

    const payment = await Payment.findOne({ razorpayOrderId: order_id });
    if (payment && payment.status !== "completed") {
      payment.razorpayPaymentId = paymentId;
      payment.status            = "completed";
      payment.paymentMethod     = method || "";
      await payment.save();

      if (!payment.enrollmentCreated && payment.course) {
        const course = await Course.findById(payment.course).populate("instructor", "fullName email");
        const user   = await User.findById(payment.user).select("fullName email");
        if (course && user) {
          await createEnrollment({
            userId:       payment.user,
            courseId:     payment.course,
            courseName:   course.title,
            userEmail:    user.email,
            userName:     user.fullName,
            instructorId: course.instructor?._id,
            instructorContact: course.instructor
              ? { email: course.instructor.email, fullName: course.instructor.fullName }
              : undefined,
          });
          payment.enrollmentCreated = true;
          await payment.save();
        }
      }
    }
  }

  if (event.event === "payment.failed") {
    const { order_id } = event.payload.payment.entity;
    await Payment.findOneAndUpdate(
      { razorpayOrderId: order_id, status: "pending" },
      { status: "failed" }
    );
  }

  return res.status(200).json({ status: "ok" });
});

// ─── POST /api/v1/payments/refund/:paymentId ──────────────────────────────────

export const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId)
    .populate({
      path: "course",
      select: "instructor title",
    })
    .populate("user", "fullName email");

  if (!payment) throw new ApiError(404, "Payment not found");
  if (!payment.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (payment.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to refund this payment");
  }
  if (payment.status !== "completed") {
    throw new ApiError(400, "Only completed payments can be refunded");
  }

  // Issue refund via Razorpay only when a real payment ID exists.
  let refundResult = null;
  if (payment.razorpayPaymentId && payment.razorpayPaymentId.trim() !== "") {
    try {
      refundResult = await getRazorpay().payments.refund(payment.razorpayPaymentId, {
        amount: payment.amount * 100, // in paise
      });
    } catch (rzpErr) {
      throw new ApiError(
        502,
        rzpErr?.error?.description || rzpErr?.message || "Razorpay refund failed"
      );
    }
  }

  payment.status = "refunded";
  await payment.save();

  // Revoke enrollment
  await Enrollment.findOneAndUpdate(
    { user: payment.user._id || payment.user, course: payment.course._id, isActive: true },
    { isActive: false }
  );
  await Course.findByIdAndUpdate(payment.course._id, { $inc: { totalEnrollments: -1 } });

  // Send refund & enrollment revocation email notification to student asynchronously
  if (payment.user?.email) {
    sendRefundEmail(payment.user.email, {
      studentName: payment.user.fullName || "Student",
      courseName:  payment.course.title || "Course",
      amount:      payment.amount,
    }).catch((err) => logger.error("Refund notification email failed:", err.message));
  }

  return res.status(200).json(
    new ApiResponse(200, { refund: refundResult }, "Refund processed and enrollment revoked")
  );
});

export const createBundleOrder = asyncHandler(async (req, res) => {
  const { bundleId } = req.params;

  const bundle = await Bundle.findById(bundleId)
    .populate("courses", "title price isArchived isPublished instructor")
    .populate("instructor", "fullName email");

  if (!bundle || !bundle.isPublished) throw new ApiError(404, "Bundle not found");

  const user = await User.findById(req.user._id).select("enrolledCourses");
  const enrolledCourseIds = new Set(user.enrolledCourses.map(e => e.course.toString()));

  const activeCourses = bundle.courses.filter(c => !c.isArchived);
  if (activeCourses.length === 0) {
    throw new ApiError(400, "This bundle does not contain any active courses");
  }

  const unownedCourses = activeCourses.filter(c => !enrolledCourseIds.has(c._id.toString()));

  if (unownedCourses.length === 0) {
    throw new ApiError(400, "You are already enrolled in all the courses in this bundle");
  }

  // Calculate dynamic price: Proportional discount based on unowned courses ratio
  const finalPrice = Math.round((bundle.price * (unownedCourses.length / activeCourses.length)) * 100) / 100;
  const amountInPaise = Math.round(finalPrice * 100);

  const razorpayOrder = await getRazorpay().orders.create({
    amount:   amountInPaise,
    currency: "INR",
    receipt:  `bundle_${Date.now()}`,
  });

  // Create one parent Payment doc for the bundle (per-course docs created on verify)
  const payment = await Payment.create({
    user:            req.user._id,
    bundle:          bundleId,
    razorpayOrderId: razorpayOrder.id,
    amount:          finalPrice,
    currency:        "INR",
    status:          "pending",
  });

  return res.status(200).json(
    new ApiResponse(200, {
      orderId:    razorpayOrder.id,
      amount:     razorpayOrder.amount,
      currency:   razorpayOrder.currency,
      paymentId:  payment._id,
      keyId:      process.env.RAZORPAY_KEY_ID,
      bundleName: bundle.title,
      bundlePrice: finalPrice,
      originalPrice: bundle.price,
      unownedCount: unownedCourses.length,
      totalCount: activeCourses.length,
    }, "Bundle order created successfully")
  );
});


// ─── POST /api/v1/payments/bundle/verify ──────────────────────────────────────

export const verifyBundlePayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment verification fields");
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw new ApiError(404, "Payment record not found");
  if (!payment.bundle) throw new ApiError(400, "This payment is not a bundle order");

  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status            = "completed";
  await payment.save();

  if (!payment.enrollmentCreated) {
    const bundle = await Bundle.findById(payment.bundle)
      .populate({
        path:     "courses",
        select:   "title instructor isArchived",
        populate: { path: "instructor", select: "fullName email" },
      });

    if (bundle) {
      const user = await User.findById(payment.user).select("enrolledCourses");
      const enrolledCourseIds = new Set(user.enrolledCourses.map(e => e.course.toString()));

      const activeCourses = bundle.courses.filter(c => !c.isArchived);
      const unownedCourses = activeCourses.filter(c => !enrolledCourseIds.has(c._id.toString()));

      if (unownedCourses.length > 0) {
        // Split the paid amount equally among the newly enrolled courses
        const splitAmount = Math.round((payment.amount / unownedCourses.length) * 100) / 100;

        for (const course of unownedCourses) {
          // 1. Enroll the student
          await createEnrollment({
            userId:       payment.user,
            courseId:     course._id,
            courseName:   course.title,
            userEmail:    req.user.email,
            userName:     req.user.fullName,
            instructorId: course.instructor?._id,
            instructorContact: course.instructor
              ? { email: course.instructor.email, fullName: course.instructor.fullName }
              : undefined,
          });

          // 2. Create a completed Payment record for this specific course to credit instructor revenue stats
          await Payment.create({
            user:              payment.user,
            course:            course._id,
            razorpayOrderId:   payment.razorpayOrderId,
            razorpayPaymentId: payment.razorpayPaymentId,
            razorpaySignature: payment.razorpaySignature,
            amount:            splitAmount,
            currency:          payment.currency,
            status:            "completed",
            enrollmentCreated: true,
            bundle:            payment.bundle,
          });
        }
      }
    }

    payment.enrollmentCreated = true;
    await payment.save();
  }

  return res.status(200).json(
    new ApiResponse(200, { payment }, "Bundle payment verified and enrollments created")
  );
});
