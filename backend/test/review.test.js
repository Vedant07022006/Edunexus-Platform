/**
 * test/review.test.js — Module 6: Reviews & Ratings
 *
 * Controller behavior confirmed:
 * - createOrUpdateReview: uses findOneAndUpdate with upsert → ALWAYS returns 200
 *   (no duplicate error — second call updates the existing review)
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createEnrollment } from './helpers/seed.helper.js';

describe('Review — Submit', () => {
  it('enrolled student can submit a review (200, upsert)', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 5, comment: 'Excellent course!' });
    // Controller uses upsert → always 200
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('rating', 5);
  });

  it('non-enrolled student cannot submit a review', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst);

    const res = await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 4, comment: 'Sneaky review' });
    expect(res.status).toBe(403);
  });

  it('duplicate review updates (not rejects) the existing review', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(student, course);

    await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 4, comment: 'First review' });

    // Second submit updates, not rejects
    const res = await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 3, comment: 'Updated review' });
    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(3); // rating was updated
  });

  it('rating must be between 1 and 5', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(student, course);

    const res = await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 6, comment: 'Too high rating' });
    expect(res.status).toBe(400);
  });

  it('instructor cannot review their own course', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst);

    const res = await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 5, comment: 'Self review' });
    // isInstructor role check → 403
    expect(res.status).toBe(403);
  });
});

describe('Review — Fetch', () => {
  it('anyone can fetch reviews for a course', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token: stuToken } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(student, course);

    await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(stuToken))
      .send({ rating: 4, comment: 'Great!' });

    const res = await request(app).get(`/api/v1/reviews/course/${course._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reviews.length).toBeGreaterThan(0);
  });
});

describe('Review — Delete', () => {
  it('student can delete their own review', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(student, course);

    await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ rating: 3, comment: 'Ok course' });

    const res = await request(app)
      .delete(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
  });
});

describe('Review — Rating Recalculation', () => {
  it('course average rating updates after reviews are added', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: s1, token: t1 } = await createUser('student');
    const { user: s2, token: t2 } = await createUser('student');
    const course = await createCourse(inst);
    await createEnrollment(s1, course);
    await createEnrollment(s2, course);

    await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(t1))
      .send({ rating: 4, comment: 'Good' });

    await request(app)
      .post(`/api/v1/reviews/course/${course._id}`)
      .set('Authorization', bearer(t2))
      .send({ rating: 2, comment: 'Meh' });

    const res = await request(app).get(`/api/v1/courses/${course._id}`);
    expect(res.status).toBe(200);
    // Average of 4 and 2 = 3.0
    expect(res.body.data.rating.average).toBe(3);
    expect(res.body.data.rating.totalRatings).toBe(2);
  });
});
