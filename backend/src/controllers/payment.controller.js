import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Payment } from "../models/payment.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { User } from "../models/user.model.js";
import { sendEnrollmentEmail, sendPaymentSuccessEmail } from "../utils/email.js";
import Razorpay from "razorpay";
import crypto from "crypto";


const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};


export const createOrder = asyncHandler(async (req, res) => {
  
  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students allowed");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (course.isArchived) {
    throw new ApiError(400, "This course is no longer available for purchase");
  }

  if (!course.isPublished) {
    throw new ApiError(400, "Course is not available");
  }

  if (course.isFree) {
    throw new ApiError(400, "This is a free course");
  }


  const instructorExists = await User.findById(course.instructor);
  if (!instructorExists) {
    throw new ApiError(400, "This course is no longer available for purchase");
  }

  if (!course.price || course.price <= 0) {
    throw new ApiError(400, "Invalid course price");
  }

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    isActive: true,
  });

  if (existingEnrollment) {
    throw new ApiError(400, "Already enrolled");
  }

  const existingPayment = await Payment.findOne({
    user: req.user._id,
    course: courseId,
    status: "pending",
  });

  if (existingPayment) {
    return res.status(200).json(
      new ApiResponse(200, {
        orderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      })
    );
  }

  const razorpay = getRazorpayInstance();
  const amount = course.price * 100;

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      courseId: courseId.toString(),
      userId: req.user._id.toString(),
    },
  });

  await Payment.create({
    user: req.user._id,
    course: courseId,
    razorpayOrderId: order.id,
    amount: course.price,
    currency: "INR",
    status: "pending",
  });

  return res.status(201).json(
    new ApiResponse(201, {
      orderId: order.id,
      amount: course.price,
      currency: "INR",
      courseName: course.title,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  );
});


export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Payment details required");
  }

  
  const paymentRecord = await Payment.findOne({ razorpayOrderId });

  if (!paymentRecord) {
    throw new ApiError(404, "Payment not found");
  }

  const courseId = paymentRecord.course;

  const body = razorpayOrderId + "|" + razorpayPaymentId;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: "failed" }
    );
    throw new ApiError(400, "Invalid payment signature");
  }

  // Fetch payment from Razorpay to verify the amount
  const razorpay = getRazorpayInstance();
  let rzpPayment;
  if (process.env.NODE_ENV !== "production" && razorpayPaymentId.startsWith("mock_")) {
    rzpPayment = { amount: paymentRecord.amount * 100 };
    // Simulate amount mismatch if paymentId says mismatch
    if (razorpayPaymentId.includes("mismatch")) {
      rzpPayment.amount = 10; 
    }
  } else {
    try {
      rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);
    } catch (error) {
      throw new ApiError(400, "Invalid payment ID or Razorpay error");
    }
  }

  if (rzpPayment.amount !== paymentRecord.amount * 100) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: "failed" }
    );
    throw new ApiError(400, "Payment amount mismatch");
  }

  
  const payment = await Payment.findOneAndUpdate(
    {
      razorpayOrderId,
      status: "pending",
      enrollmentCreated: false,
    },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: "completed",
      enrollmentCreated: true,
    },
    { new: true }
  );

  if (!payment) {
    const existing = await Payment.findOne({ razorpayOrderId });
    if (existing?.enrollmentCreated) {
      return res.status(200).json(
        new ApiResponse(200, null, "Already processed")
      );
    }
    throw new ApiError(404, "Payment record not found");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (!course.instructor) {
    throw new ApiError(400, "This course is no longer available");
  }

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
  });

  if (!existingEnrollment) {
    
    await Enrollment.create({
      user: req.user._id,
      course: courseId,
      isActive: true,
      progress: 0,
    });

    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalEnrollments: 1 },
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        enrolledCourses: {
          course: courseId,
          enrolledAt: new Date(),
        },
      },
    });
  } else if (!existingEnrollment.isActive) {
    
    existingEnrollment.isActive = true;
    await existingEnrollment.save();

    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalEnrollments: 1 },
    });
  }
  

  try {
    await sendPaymentSuccessEmail(req.user.email, {
      studentName: req.user.fullName,
      courseName: course.title,
      amount: payment.amount,
    });

    await sendEnrollmentEmail(req.user.email, {
      studentName: req.user.fullName,
      courseName: course.title,
    });
  } catch (err) {
    console.error("Email failed:", err.message);
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Payment verified successfully")
  );
});


export const getPaymentHistory = asyncHandler(async (req, res) => {
  
  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students allowed");
  }

  const payments = await Payment.find({ user: req.user._id })
    .populate("course", "title thumbnail price")
    .select("-razorpaySignature -__v")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      payments,
      total: payments.length,
    })
  );
});


export const getCoursePayments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!course.instructor) throw new ApiError(404, "This course is no longer available");

  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const payments = await Payment.find({
    course: courseId,
    status: "completed",
  })
    .populate("user", "fullName email")
    .select("-razorpaySignature -__v")
    .sort({ createdAt: -1 });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  return res.status(200).json(
    new ApiResponse(200, {
      payments,
      total: payments.length,
      totalRevenue,
    })
  );
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not set");
    return res.status(500).send("Webhook secret not configured");
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).send("No signature provided");
  }

  // req.rawBody is the raw Buffer captured before express.json() in app.js
  // Using the raw buffer ensures correct signature verification (avoids JSON key ordering issues)
  const bodyForSigning = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(bodyForSigning)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const event = req.body.event;

  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = req.body.payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amount = paymentEntity.amount; // in paise

    const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
    if (!paymentRecord) {
      return res.status(404).send("Payment not found");
    }

    if (paymentRecord.status === "completed") {
      return res.status(200).send("Already processed");
    }

    if (amount !== paymentRecord.amount * 100) {
      paymentRecord.status = "failed";
      await paymentRecord.save();
      return res.status(400).send("Amount mismatch");
    }

    const courseId = paymentRecord.course;
    const userId = paymentRecord.user;

    const webhookCourse = await Course.findById(courseId).select("instructor");
    if (!webhookCourse || !webhookCourse.instructor) {
      paymentRecord.status = "failed";
      await paymentRecord.save();
      return res.status(400).send("Course or instructor not found");
    }

    paymentRecord.razorpayPaymentId = paymentId;
    paymentRecord.status = "completed";
    paymentRecord.enrollmentCreated = true;
    await paymentRecord.save();

    const existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!existingEnrollment) {
      await Enrollment.create({
        user: userId,
        course: courseId,
        isActive: true,
        progress: 0,
      });

      await Course.findByIdAndUpdate(courseId, {
        $inc: { totalEnrollments: 1 },
      });

      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          enrolledCourses: {
            course: courseId,
            enrolledAt: new Date(),
          },
        },
      });
    } else if (!existingEnrollment.isActive) {
      existingEnrollment.isActive = true;
      await existingEnrollment.save();

      await Course.findByIdAndUpdate(courseId, {
        $inc: { totalEnrollments: 1 },
      });
    }

    // Try sending email
    try {
      const course = await Course.findById(courseId);
      const user = await User.findById(userId);
      await sendPaymentSuccessEmail(user.email, {
        studentName: user.fullName,
        courseName: course.title,
        amount: paymentRecord.amount,
      });

      await sendEnrollmentEmail(user.email, {
        studentName: user.fullName,
        courseName: course.title,
      });
    } catch (err) {
      console.error("Email failed:", err.message);
    }
  }

  if (event === "payment.failed") {
    const paymentEntity = req.body.payload.payment.entity;
    const orderId = paymentEntity.order_id;

    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { status: "failed" }
    );
  }

  res.status(200).send("Webhook processed");
});

