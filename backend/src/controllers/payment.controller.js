// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Payment } from "../models/payment.model.js";
// import { Course } from "../models/course.model.js";
// import { Enrollment } from "../models/enrollment.model.js";
// import { User } from "../models/user.model.js";
// import { sendEnrollmentEmail, sendPaymentSuccessEmail } from "../utils/email.js";
// import Razorpay from "razorpay";
// import crypto from "crypto";


// const getRazorpayInstance = () => {
//   return new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
//   });
// };


// // CREATE ORDER — Student only

// export const createOrder = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   if (!course.isPublished) throw new ApiError(400, "Course is not available");

//   if (course.isFree) {
//     throw new ApiError(400, "This is a free course. No payment required.");
//   }

//   const existingEnrollment = await Enrollment.findOne({
//     user: req.user._id,
//     course: courseId,
//     isActive: true,
//   });

//   if (existingEnrollment) {
//     throw new ApiError(400, "You are already enrolled in this course");
//   }

//   // Return existing pending order if exists
//   const existingPayment = await Payment.findOne({
//     user: req.user._id,
//     course: courseId,
//     status: "pending",
//   });

//   if (existingPayment) {
//     return res.status(200).json(
//       new ApiResponse(
//         200,
//         {
//           orderId: existingPayment.razorpayOrderId,
//           amount: existingPayment.amount,
//           currency: existingPayment.currency,
//           keyId: process.env.RAZORPAY_KEY_ID,
//         },
//         "Existing order fetched"
//       )
//     );
//   }

  
//   const razorpay = getRazorpayInstance();
//   const amount = course.price * 100; // paise

//   const order = await razorpay.orders.create({
//     amount,
//     currency: "INR",
//     receipt: `receipt_${Date.now()}`,
//     notes: {
//       courseId: courseId.toString(),
//       userId: req.user._id.toString(),
//     },
//   });

//   await Payment.create({
//     user: req.user._id,
//     course: courseId,
//     razorpayOrderId: order.id,
//     amount: course.price,
//     currency: "INR",
//     status: "pending",
//   });

//   return res.status(201).json(
//     new ApiResponse(
//       201,
//       {
//         orderId: order.id,
//         amount: course.price,
//         currency: "INR",
//         courseName: course.title,
//         keyId: process.env.RAZORPAY_KEY_ID,
//       },
//       "Order created successfully"
//     )
//   );
// });



// export const verifyPayment = asyncHandler(async (req, res) => {
//   const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = req.body;

//   if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId) {
//     throw new ApiError(400, "All payment details are required");
//   }

 
//   const body = razorpayOrderId + "|" + razorpayPaymentId;
//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//     .update(body.toString())
//     .digest("hex");

//   if (expectedSignature !== razorpaySignature) {
//     await Payment.findOneAndUpdate({ razorpayOrderId }, { status: "failed" });
//     throw new ApiError(400, "Payment verification failed. Invalid signature.");
//   }

  
//   const payment = await Payment.findOneAndUpdate(
//     {
//       razorpayOrderId,
//       status: "pending",       
//       enrollmentCreated: false, 
//     },
//     {
//       razorpayPaymentId,
//       razorpaySignature,
//       status: "completed",
//       enrollmentCreated: true,  
//     },
//     { returnDocument: 'after' }
//   );


//   if (!payment) {
//     const existingPayment = await Payment.findOne({ razorpayOrderId });
//     if (existingPayment?.enrollmentCreated) {
//       return res.status(200).json(
//         new ApiResponse(200, null, "Payment already verified and enrollment created")
//       );
//     }
//     throw new ApiError(404, "Payment record not found");
//   }

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   // Create enrollment
//   await Enrollment.create({
//     user: req.user._id,
//     course: courseId,
//     isActive: true,
//     progress: 0,
//   });

//   await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });

//   await User.findByIdAndUpdate(req.user._id, {
//     $push: {
//       enrolledCourses: {
//         course: courseId,
//         enrolledAt: new Date(),
//       },
//     },
//   });

 
//   try {
//     await sendPaymentSuccessEmail(req.user.email, {
//       studentName: req.user.fullName,
//       courseName: course.title,
//       amount: payment.amount,
//     });
//     await sendEnrollmentEmail(req.user.email, {
//       studentName: req.user.fullName,
//       courseName: course.title,
//     });
//   } catch (err) {
//     console.error("Email failed:", err.message);
//   }

//   return res.status(200).json(
//     new ApiResponse(200, null, "Payment verified and enrollment created successfully")
//   );
// });


// // GET PAYMENT HISTORY — Student only

// export const getPaymentHistory = asyncHandler(async (req, res) => {
//   const payments = await Payment.find({ user: req.user._id })
//     .populate("course", "title thumbnail price")
//     .select("-razorpaySignature -__v")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(200, { payments, total: payments.length }, "Payment history fetched successfully")
//   );
// });


// // GET COURSE PAYMENTS — Instructor only

// export const getCoursePayments = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const course = await Course.findById(courseId);
//   if (!course) throw new ApiError(404, "Course not found");

//   if (course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to view these payments");
//   }

//   const payments = await Payment.find({ course: courseId, status: "completed" })
//     .populate("user", "fullName email")
//     .select("-razorpaySignature -__v")
//     .sort({ createdAt: -1 });

//   const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

//   return res.status(200).json(
//     new ApiResponse(200, { payments, total: payments.length, totalRevenue }, "Course payments fetched successfully")
//   );
// });









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

// KEEP YOUR APPROACH (no change here)
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ================= CREATE ORDER =================
export const createOrder = asyncHandler(async (req, res) => {
  // ✅ MUST FIX: role check
  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students allowed");
  }

  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  if (!course.isPublished) {
    throw new ApiError(400, "Course is not available");
  }

  if (course.isFree) {
    throw new ApiError(400, "This is a free course");
  }

  // ✅ MUST FIX: validate price
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

// ================= VERIFY PAYMENT =================
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Payment details required");
  }

  // ✅ MUST FIX: get payment from DB (DO NOT trust client)
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

  // Update payment safely
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
    { returnDocument: "after" }
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

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
  });

  if (!existingEnrollment) {
    // First time enrolling — create fresh enrollment
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
    // Previously revoked — re-activate on new payment
    existingEnrollment.isActive = true;
    await existingEnrollment.save();

    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalEnrollments: 1 },
    });
  }
  // else: already active enrollment — do nothing (idempotent)

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

// ================= PAYMENT HISTORY =================
export const getPaymentHistory = asyncHandler(async (req, res) => {
  // ✅ MUST FIX: role check
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

// ================= COURSE PAYMENTS =================
export const getCoursePayments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

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

