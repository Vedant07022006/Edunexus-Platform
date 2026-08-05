import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Coupon } from "./coupon.model.js";
import { Course } from "../course/course.model.js";

const assertOwnsCourse = async (courseId, instructorId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "Not authorized");
  }
  return course;
};

export const createCoupon = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { code, discountPercent, maxUses, expiresAt } = req.body;

  if (!code || !discountPercent) {
    throw new ApiError(400, "Code and discount percent are required");
  }

  await assertOwnsCourse(courseId, req.user._id);

  const existing = await Coupon.findOne({ course: courseId, code: code.toUpperCase().trim() });
  if (existing) throw new ApiError(400, "A coupon with this code already exists for this course");

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    instructor: req.user._id,
    course: courseId,
    discountPercent: Number(discountPercent),
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt || null,
  });

  return res.status(201).json(new ApiResponse(201, coupon, "Coupon created"));
});

export const getCourseCoupons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await assertOwnsCourse(courseId, req.user._id);

  const coupons = await Coupon.find({ course: courseId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { coupons }));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  if (coupon.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }
  await Coupon.findByIdAndDelete(couponId);
  return res.status(200).json(new ApiResponse(200, null, "Coupon deleted"));
});

// Student-facing: validate a code against a course and return the
// discounted price, without redeeming it yet (redemption happens at
// payment verification time — see payment.controller.js).
export const validateCoupon = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { code } = req.body;
  if (!code) throw new ApiError(400, "Coupon code is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const coupon = await Coupon.findOne({ course: courseId, code: code.toUpperCase().trim() });
  if (!coupon || !coupon.isActive) throw new ApiError(404, "Invalid coupon code");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, "Coupon has expired");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new ApiError(400, "Coupon usage limit reached");
  }

  const discountedPrice = Math.round(course.price * (1 - coupon.discountPercent / 100));

  return res.status(200).json(
    new ApiResponse(200, {
      valid: true,
      discountPercent: coupon.discountPercent,
      originalPrice: course.price,
      discountedPrice,
    })
  );
});
