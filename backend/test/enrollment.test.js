/**
 * test/enrollment.test.js — Module 3: Enrollment
 *
 * Controller response shapes confirmed:
 * - enrollFreeCourse: returns enrollment document directly in data (not data.enrollment)
 * - updateProgress: body field is `lectureId` (not `completedLectureId`); response has { progress, completedLectures, totalLectures }
 * - updateLastWatchedPosition: returns null data when not enrolled (no-op); returns enrollment when enrolled
 * - checkEnrollment: returns { isEnrolled, enrollment }
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createLecture, createEnrollment } from './helpers/seed.helper.js';

describe('Enrollment — Free Course', () => {
  it('student can enroll in a free published course', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isFree: true, isPublished: true });

    const res = await request(app)
      .post(`/api/v1/enrollments/enroll/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(201);
    // Controller returns enrollment directly in data (not data.enrollment)
    expect(res.body.data).toHaveProperty('isActive', true);
  });

  it('student cannot enroll in a paid course via free endpoint', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { isFree: false, price: 999, isPublished: true });

    const res = await request(app)
      .post(`/api/v1/enrollments/enroll/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(400);
  });

  it('student cannot double-enroll', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isFree: true, isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .post(`/api/v1/enrollments/enroll/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(400);
  });

  it('instructor cannot use free-enroll endpoint', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst, { isFree: true });

    const res = await request(app)
      .post(`/api/v1/enrollments/enroll/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(403);
  });
});

describe('Enrollment — Check Enrollment', () => {
  it('returns isEnrolled: true for enrolled student', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(student, course);

    const res = await request(app)
      .get(`/api/v1/enrollments/check/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isEnrolled).toBe(true);
  });

  it('returns isEnrolled: false for non-enrolled student', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst);

    const res = await request(app)
      .get(`/api/v1/enrollments/check/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isEnrolled).toBe(false);
  });
});

describe('Enrollment — Progress Update', () => {
  it('student can update progress for an enrolled course', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    const lecture = await createLecture(course);
    await createEnrollment(student, course);

    // Controller expects `lectureId` (not `completedLectureId`)
    const res = await request(app)
      .patch(`/api/v1/enrollments/progress/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ lectureId: lecture._id.toString() });
    expect(res.status).toBe(200);
    // Response shape: { progress, completedLectures, totalLectures, isCompleted }
    expect(res.body.data).toHaveProperty('progress');
    expect(res.body.data).toHaveProperty('completedLectures');
  });

  it('student cannot update progress for a course they are not enrolled in (paid course → 403)', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { isFree: false, price: 499 });

    const res = await request(app)
      .patch(`/api/v1/enrollments/progress/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ lectureId: '000000000000000000000000' });
    expect(res.status).toBe(403);
  });
});

describe('Enrollment — Last Watched Position', () => {
  it('saves resume position for enrolled student (returns 200)', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    const lecture = await createLecture(course);
    await createEnrollment(student, course);

    const res = await request(app)
      .patch(`/api/v1/enrollments/position/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ lectureId: lecture._id.toString(), seconds: 42 });
    expect(res.status).toBe(200);
    // Controller always returns null data for position updates (it's a no-op
    // response to keep the heartbeat cheap — actual data is saved in DB)
    expect(res.body.message).toMatch(/saved|position/i);
  });

  it('returns 200 (no-op) for unenrolled student — position not tracked', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst);
    const lecture = await createLecture(course);

    // Controller: if no enrollment found → 200 with null data (no-op, not an error)
    const res = await request(app)
      .patch(`/api/v1/enrollments/position/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ lectureId: lecture._id.toString(), seconds: 10 });
    expect(res.status).toBe(200);
  });
});

describe('Enrollment — My Enrollments', () => {
  it('returns the students enrolled courses', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isFree: true, isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .get('/api/v1/enrollments/my-enrollments')
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.enrollments.length).toBeGreaterThan(0);
  });
});
