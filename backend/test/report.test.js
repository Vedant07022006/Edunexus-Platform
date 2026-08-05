/**
 * test/report.test.js — Module 9: Reports / Moderation
 *
 * Controller behavior confirmed:
 * - createReport body: { targetType, targetId, courseId, reason }
 *   (NOT `course` — it's `courseId`)
 * - createReport returns report document directly in data (not data.report)
 * - getMyReports returns { reports, total }
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createLecture, createEnrollment } from './helpers/seed.helper.js';

describe('Report — Create', () => {
  it('enrolled student can create a report on a lecture', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', bearer(token))
      .send({
        targetType: 'lecture',
        targetId:   lecture._id.toString(),
        courseId:   course._id.toString(),  // controller expects `courseId` not `course`
        reason:     'Contains inappropriate content',
      });
    expect(res.status).toBe(201);
    // Controller returns report directly in data
    expect(res.body.data).toHaveProperty('status', 'pending');
  });

  it('cannot create a report without reason', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    const lecture = await createLecture(course);

    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', bearer(token))
      .send({
        targetType: 'lecture',
        targetId:   lecture._id.toString(),
        courseId:   course._id.toString(),
        // reason is missing
      });
    expect(res.status).toBe(400);
  });

  it('unauthenticated user cannot create a report', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        targetType: 'lecture',
        targetId:   '000000000000000000000000',
        courseId:   '000000000000000000000000',
        reason:     'Inappropriate',
      });
    expect(res.status).toBe(401);
  });
});

describe('Report — Get Mine (Instructor)', () => {
  it('instructor can view reports for their own courses', async () => {
    const { user: inst, token: instToken } = await createUser('instructor');
    const { user: student, token: stuToken } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    // Student submits a report
    await request(app)
      .post('/api/v1/reports')
      .set('Authorization', bearer(stuToken))
      .send({
        targetType: 'lecture',
        targetId:   lecture._id.toString(),
        courseId:   course._id.toString(),
        reason:     'Bad content',
      });

    // Route: GET /api/v1/reports/mine (not /my)
    const res = await request(app)
      .get('/api/v1/reports/mine')
      .set('Authorization', bearer(instToken));
    expect(res.status).toBe(200);
    expect(res.body.data.reports.length).toBeGreaterThan(0);
  });

  it('student cannot access instructor-only report list', async () => {
    const { token } = await createUser('student');
    // isInstructor middleware blocks students with 403
    const res = await request(app)
      .get('/api/v1/reports/mine')
      .set('Authorization', bearer(token));
    expect(res.status).toBe(403);
  });
});

describe('Report — Resolve', () => {
  it('instructor can resolve a report on their own course', async () => {
    const { user: inst, token: instToken } = await createUser('instructor');
    const { user: student, token: stuToken } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', bearer(stuToken))
      .send({
        targetType: 'lecture',
        targetId:   lecture._id.toString(),
        courseId:   course._id.toString(),
        reason:     'Test report to resolve',
      });
    const reportId = reportRes.body.data._id;

    // Route: PATCH /api/v1/reports/:reportId (not /:reportId/resolve)
    const res = await request(app)
      .patch(`/api/v1/reports/${reportId}`)
      .set('Authorization', bearer(instToken))
      .send({ status: 'reviewed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('reviewed');
  });

  it('instructor cannot resolve a report on another instructors course', async () => {
    const { user: owner } = await createUser('instructor');
    const { user: student, token: stuToken } = await createUser('student');
    const { token: otherInstToken } = await createUser('instructor');
    const course = await createCourse(owner, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', bearer(stuToken))
      .send({
        targetType: 'lecture',
        targetId:   lecture._id.toString(),
        courseId:   course._id.toString(),
        reason:     'Wrong instructor test',
      });
    const reportId = reportRes.body.data._id;

    // Route: PATCH /api/v1/reports/:reportId (not /:reportId/resolve)
    const res = await request(app)
      .patch(`/api/v1/reports/${reportId}`)
      .set('Authorization', bearer(otherInstToken))
      .send({ status: 'reviewed' });
    expect(res.status).toBe(403);
  });
});
