/**
 * test/helpers/seed.helper.js
 * Creates test courses, lectures, enrollments etc. for use in tests.
 */

import { Course }     from '../../src/models/course.model.js';
import { Lecture }    from '../../src/models/lecture.model.js';
import { Enrollment } from '../../src/models/enrollment.model.js';
import { Payment }    from '../../src/models/payment.model.js';
import { Coupon }     from '../../src/models/coupon.model.js';

let _courseCounter = 0;

export async function createCourse(instructor, overrides = {}) {
  const n = ++_courseCounter;
  return Course.create({
    title:       overrides.title        || `Test Course ${n}`,
    description: overrides.description  || 'Test description for course',
    category:    overrides.category     || 'Programming',
    level:       overrides.level        || 'beginner',
    language:    overrides.language     || 'English',
    price:       overrides.price        ?? 999,
    isFree:      overrides.isFree       ?? false,
    isPublished: overrides.isPublished  ?? true,
    isArchived:  overrides.isArchived   ?? false,
    instructor:  instructor._id,
    ...overrides,
  });
}

export async function createLecture(course, overrides = {}) {
  const count = await Lecture.countDocuments({ course: course._id });
  return Lecture.create({
    course:      course._id,
    title:       overrides.title       || `Lecture ${count + 1}`,
    order:       overrides.order       ?? (count + 1),
    isFree:      overrides.isFree      ?? false,
    isPublished: overrides.isPublished ?? true,
    releaseDate: overrides.releaseDate ?? null,
    ...overrides,
  });
}

export async function createEnrollment(user, course, overrides = {}) {
  await Course.findByIdAndUpdate(course._id, { $inc: { totalEnrollments: 1 } });
  return Enrollment.create({
    user:   user._id,
    course: course._id,
    isActive: true,
    progress: 0,
    ...overrides,
  });
}

export async function createCompletedPayment(user, course, overrides = {}) {
  return Payment.create({
    user:             user._id,
    course:           course._id,
    razorpayOrderId:  `order_test_${Date.now()}`,
    razorpayPaymentId:`pay_test_${Date.now()}`,
    amount:           course.price,
    currency:         'INR',
    status:           'completed',
    enrollmentCreated: true,
    ...overrides,
  });
}

export async function createCoupon(instructor, course, overrides = {}) {
  return Coupon.create({
    code:            overrides.code            || 'TEST20',
    instructor:      instructor._id,
    course:          course._id,
    discountPercent: overrides.discountPercent ?? 20,
    isActive:        overrides.isActive        ?? true,
    maxUses:         overrides.maxUses         ?? null,
    expiresAt:       overrides.expiresAt       ?? null,
    usedCount:       overrides.usedCount       ?? 0,
    ...overrides,
  });
}
