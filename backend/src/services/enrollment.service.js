import { Enrollment } from "../modules/enrollment/enrollment.model.js";
import { Course }     from "../modules/course/course.model.js";
import { User }       from "../modules/user/user.model.js";
import {
  sendEnrollmentEmail,
  sendInstructorEnrollmentEmail,
} from "../utils/email.js";
import logger from "../utils/logger.js";

/**
 * Creates (or reactivates) an Enrollment record for a student, updates the
 * course's `totalEnrollments` counter and the user's `enrolledCourses` list,
 * then fires confirmation e-mails to both the student and the instructor
 * (emails are best-effort — failures are logged but never thrown).
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.userId        - Student's _id
 * @param {string|ObjectId} opts.courseId      - Course _id
 * @param {string}          opts.courseName    - Human-readable course title
 * @param {string}          opts.userEmail     - Student's email address
 * @param {string}          opts.userName      - Student's full name
 * @param {string|ObjectId} [opts.instructorId] - Instructor's _id (optional;
 *                                               when provided, the instructor
 *                                               receives a notification email)
 * @param {object}  [opts.instructorContact]   - Pre-fetched { email, fullName }
 *                                               — skips the extra DB lookup
 *                                               when the caller already has it.
 * @returns {Promise<Enrollment>}              - The enrollment document
 */
export const createEnrollment = async ({
  userId,
  courseId,
  courseName,
  userEmail,
  userName,
  instructorId,
  instructorContact,
}) => {
  // ── 1. Idempotent: reactivate if the enrollment already exists ──────────────
  const existing = await Enrollment.findOne({ user: userId, course: courseId });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return existing;
  }

  // ── 2. Create new enrollment ────────────────────────────────────────────────
  const enrollment = await Enrollment.create({
    user:     userId,
    course:   courseId,
    isActive: true,
    progress: 0,
  });

  // ── 3. Update counters (fire-and-forget style; failures don't block) ────────
  await Promise.all([
    Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } }),
    User.findByIdAndUpdate(userId, {
      $addToSet: { enrolledCourses: { course: courseId, enrolledAt: new Date() } },
    }),
  ]);

  // ── 4. Student confirmation email (best-effort) ─────────────────────────────
  try {
    await sendEnrollmentEmail(userEmail, { studentName: userName, courseName });
  } catch (err) {
    logger.error("Enrollment email failed:", err.message);
  }

  // ── 5. Instructor notification email (best-effort) ──────────────────────────
  if (instructorId) {
    try {
      let contact = instructorContact;
      if (!contact) {
        const instructor = await User.findById(instructorId).select("fullName email");
        if (instructor) contact = { email: instructor.email, fullName: instructor.fullName };
      }
      if (contact) {
        await sendInstructorEnrollmentEmail(contact.email, {
          instructorName: contact.fullName,
          studentName:    userName,
          courseName,
          enrolledAt:     new Date(),
        });
      }
    } catch (err) {
      logger.error("Instructor enrollment notification email failed:", err.message);
    }
  }

  return enrollment;
};
