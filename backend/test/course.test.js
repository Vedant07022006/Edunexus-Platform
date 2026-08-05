/**
 * test/course.test.js — Module 2: Course CRUD
 *
 * Controller behavior confirmed:
 * - createCourse: requires title + description + category (was missing description in tests)
 * - analytics: returns { totalStudents, completionRate, avgProgress, ... } NOT totalEnrollments
 * - createCourse route uses uploadThumbnail multer middleware — thumbnail is optional
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse } from './helpers/seed.helper.js';

describe('Course — Create', () => {
  it('instructor can create a course', async () => {
    const { token } = await createUser('instructor');
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', bearer(token))
      .field('title', 'Test Course')
      .field('description', 'A comprehensive course about testing')  // required field
      .field('category', 'Programming')
      .field('level', 'beginner')
      .field('language', 'English')
      .field('price', '499');
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('title', 'Test Course');
  });

  it('student cannot create a course', async () => {
    const { token } = await createUser('student');
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', bearer(token))
      .field('title', 'Bad Course')
      .field('description', 'Student trying to create course')
      .field('category', 'Math')
      .field('price', '0');
    expect(res.status).toBe(403);
  });

  it('should reject course with missing required fields (no description)', async () => {
    const { token } = await createUser('instructor');
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', bearer(token))
      .field('title', 'No Description')
      .field('category', 'Programming')
      .field('price', '100');
    // description is required → 400
    expect(res.status).toBe(400);
  });
});

describe('Course — Publish / Unpublish', () => {
  it('instructor can publish their own course', async () => {
    const { user, token } = await createUser('instructor');
    const course = await createCourse(user, { isPublished: false });

    const res = await request(app)
      .patch(`/api/v1/courses/${course._id}/publish`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isPublished).toBe(true);
  });

  it('another instructor cannot publish someone elses course', async () => {
    const { user: owner } = await createUser('instructor');
    const { token: otherToken } = await createUser('instructor');
    const course = await createCourse(owner, { isPublished: false });

    const res = await request(app)
      .patch(`/api/v1/courses/${course._id}/publish`)
      .set('Authorization', bearer(otherToken));
    expect(res.status).toBe(403);
  });
});

describe('Course — Archive & Restore', () => {
  it('instructor can archive their own course', async () => {
    const { user, token } = await createUser('instructor');
    const course = await createCourse(user);

    const res = await request(app)
      .delete(`/api/v1/courses/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
  });

  it('instructor can restore an archived course', async () => {
    const { user, token } = await createUser('instructor');
    const course = await createCourse(user, { isArchived: true, isPublished: false });

    const res = await request(app)
      .patch(`/api/v1/courses/${course._id}/restore`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
  });
});

describe('Course — Search & Browse', () => {
  it('GET /courses returns published, non-archived courses', async () => {
    const { user } = await createUser('instructor');
    await createCourse(user, { isPublished: true, isArchived: false, title: 'Public Course' });
    await createCourse(user, { isPublished: false, title: 'Draft Course' });

    const res = await request(app).get('/api/v1/courses');
    expect(res.status).toBe(200);
    const titles = res.body.data.courses.map(c => c.title);
    expect(titles).toContain('Public Course');
    expect(titles).not.toContain('Draft Course');
  });

  it('GET /courses/search returns matching results', async () => {
    const { user } = await createUser('instructor');
    await createCourse(user, { title: 'React Mastery', isPublished: true });

    const res = await request(app).get('/api/v1/courses/search?q=React');
    expect(res.status).toBe(200);
    expect(res.body.data.courses.length).toBeGreaterThan(0);
  });
});

describe('Course — Get by ID', () => {
  it('returns 404 for non-existent course', async () => {
    const res = await request(app).get('/api/v1/courses/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

describe('Course — Analytics', () => {
  it('instructor can view analytics for their own course', async () => {
    const { user, token } = await createUser('instructor');
    const course = await createCourse(user);

    const res = await request(app)
      .get(`/api/v1/courses/${course._id}/analytics`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    // Analytics returns totalStudents (not totalEnrollments)
    expect(res.body.data).toHaveProperty('totalStudents');
    expect(res.body.data).toHaveProperty('completionRate');
    expect(res.body.data).toHaveProperty('avgProgress');
  });

  it('another instructor cannot see course analytics', async () => {
    const { user: owner } = await createUser('instructor');
    const { token: otherToken } = await createUser('instructor');
    const course = await createCourse(owner);

    const res = await request(app)
      .get(`/api/v1/courses/${course._id}/analytics`)
      .set('Authorization', bearer(otherToken));
    expect(res.status).toBe(403);
  });
});
