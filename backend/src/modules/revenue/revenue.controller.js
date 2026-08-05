import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Course } from "../course/course.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { Payment } from "../payment/payment.model.js";

// ─── GET /api/v1/revenue/stats ─────────────────────────────────────────────────
export const getRevenueStats = asyncHandler(async (req, res) => {
  const instructorId = req.user._id;

  const courses = await Course.find({
    instructor: instructorId,
    isArchived: false,
  }).select("_id isFree");

  const courseIds = courses.map((c) => c._id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, thisMonthPayments, totalStudents] = await Promise.all([
    Payment.find({ course: { $in: courseIds }, status: "completed" }).select("amount"),
    Payment.find({
      course: { $in: courseIds },
      status: "completed",
      createdAt: { $gte: startOfMonth },
    }).select("amount"),
    Enrollment.countDocuments({ course: { $in: courseIds }, isActive: true }),
  ]);

  const totalRevenue    = payments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  return res.status(200).json(
    new ApiResponse(200, {
      totalRevenue,
      thisMonthRevenue,
      totalStudents,
      totalCourses: courses.length,
    })
  );
});

// ─── GET /api/v1/revenue/courses ───────────────────────────────────────────────
// Paginated list of instructor's courses, each with their enrolled students
export const getRevenueCourses = asyncHandler(async (req, res) => {
  const instructorId = req.user._id;
  const {
    page   = 1,
    limit  = 5,
    search = "",
    sort   = "revenue",
  } = req.query;

  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(20, Math.max(1, Number(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const filter = {
    instructor: instructorId,
    isArchived: false,
    ...(search ? { title: { $regex: search, $options: "i" } } : {}),
  };

  const allCourses = await Course.find(filter).select(
    "_id title thumbnail isFree price totalEnrollments createdAt"
  );

  // Fetch payments & live enrollment counts per course
  const courseIds = allCourses.map((c) => c._id);
  const [payments, liveEnrollmentCounts] = await Promise.all([
    Payment.find({
      course: { $in: courseIds },
      status: "completed",
    }).select("course amount"),
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, isActive: true } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
  ]);

  const liveEnrollmentMap = new Map(
    liveEnrollmentCounts.map((e) => [e._id.toString(), e.count])
  );

  const revenueMap = {};
  payments.forEach((p) => {
    const id = p.course.toString();
    revenueMap[id] = (revenueMap[id] || 0) + p.amount;
  });

  // Sort in memory using live counts
  const sorted = allCourses.slice().sort((a, b) => {
    const aCount = liveEnrollmentMap.get(a._id.toString()) || 0;
    const bCount = liveEnrollmentMap.get(b._id.toString()) || 0;
    if (sort === "revenue") {
      return (revenueMap[b._id.toString()] || 0) - (revenueMap[a._id.toString()] || 0);
    }
    if (sort === "students") return bCount - aCount;
    // newest
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const paginated = sorted.slice(skip, skip + limitNum);
  const total     = sorted.length;

  // Fetch enrollments for each paginated course
  const enrollments = await Enrollment.find({
    course: { $in: paginated.map((c) => c._id) },
    isActive: true,
  })
    .populate("user", "fullName email")
    .select("course user createdAt")
    .sort({ createdAt: -1 });

  // Group enrollments by course
  const enrollmentMap = {};
  enrollments.forEach((e) => {
    const id = e.course.toString();
    if (!enrollmentMap[id]) enrollmentMap[id] = [];
    enrollmentMap[id].push({
      _id:         e._id,
      studentName: e.user?.fullName || "Unknown",
      email:       e.user?.email || "",
      enrolledAt:  e.createdAt,
    });
  });

  // Build per-payment amount per student (accurate)
  const paymentDetails = await Payment.find({
    course: { $in: paginated.map((c) => c._id) },
    status: "completed",
  })
    .populate("user", "fullName email")
    .select("course user amount createdAt");

  const paymentMap = {};
  paymentDetails.forEach((p) => {
    const cid = p.course.toString();
    if (!paymentMap[cid]) paymentMap[cid] = [];
    paymentMap[cid].push({
      studentName: p.user?.fullName || "Unknown",
      email:       p.user?.email || "",
      amountPaid:  p.amount,
      enrolledAt:  p.createdAt,
    });
  });

  const courses = paginated.map((course) => {
    const cid      = course._id.toString();
    const isFree   = course.isFree;
    const revenue  = revenueMap[cid] || 0;
    const studentCount = liveEnrollmentMap.get(cid) || 0;

    // For paid courses use payment records; for free use enrollment records
    const students = isFree
      ? (enrollmentMap[cid] || []).map((e) => ({
          studentName: e.studentName,
          email:       e.email,
          amountPaid:  0,
          enrolledAt:  e.enrolledAt,
        }))
      : (paymentMap[cid] || []);

    return {
      _id:          course._id,
      title:        course.title,
      thumbnail:    course.thumbnail,
      isFree,
      price:        course.price,
      revenue,
      studentCount,
      students,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, {
      courses,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});
