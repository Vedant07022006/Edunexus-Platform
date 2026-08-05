/**
 * test/discussion.test.js — Module 7: Discussions / Q&A
 *
 * Controller behavior confirmed:
 * - createComment: returns populated comment document directly in data (not data.comment)
 * - deleteComment: returns null in data
 * - isInstructorReply field IS stored on the comment doc
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createLecture, createEnrollment } from './helpers/seed.helper.js';

describe('Discussion — Post Comment', () => {
  it('enrolled student can post a comment on a lecture', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token))
      .send({ text: 'Great explanation!' });
    expect(res.status).toBe(201);
    // Controller returns comment document directly in data (not data.comment)
    expect(res.body.data).toHaveProperty('text', 'Great explanation!');
  });

  it('unenrolled student cannot post a comment (paid course)', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true, isFree: false });
    const lecture = await createLecture(course, { isPublished: true, isFree: false });

    const res = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token))
      .send({ text: 'Can I comment?' });
    expect(res.status).toBe(403);
  });

  it('course instructor can post a comment on any lecture in their course', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });

    const res = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token))
      .send({ text: 'Instructor reply here' });
    expect(res.status).toBe(201);
    // isInstructorReply is stored on the returned comment doc
    expect(res.body.data.isInstructorReply).toBe(true);
  });

  it('another instructor cannot comment on someone elses paid course lecture', async () => {
    const { user: owner } = await createUser('instructor');
    const { token: otherToken } = await createUser('instructor');
    const course = await createCourse(owner, { isPublished: true, isFree: false });
    const lecture = await createLecture(course, { isPublished: true, isFree: false });

    const res = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(otherToken))
      .send({ text: 'Random instructor sneaking in' });
    expect(res.status).toBe(403);
  });
});

describe('Discussion — Get Comments', () => {
  it('enrolled student can fetch comments for a lecture', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token))
      .send({ text: 'Hello!' });

    const res = await request(app)
      .get(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.comments.length).toBeGreaterThan(0);
  });
});

describe('Discussion — Delete Comment', () => {
  it('student can delete their own comment', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const postRes = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(token))
      .send({ text: 'Delete me' });
    // Comment is returned directly in data (not data.comment)
    const commentId = postRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/discussions/${commentId}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
  });

  it('another student cannot delete someone elses comment', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: s1, token: t1 } = await createUser('student');
    const { user: s2, token: t2 } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(s1, course);
    await createEnrollment(s2, course);

    const postRes = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(t1))
      .send({ text: 'Student 1 comment' });
    const commentId = postRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/discussions/${commentId}`)
      .set('Authorization', bearer(t2));
    expect(res.status).toBe(403);
  });

  it('course instructor can delete any comment on their course', async () => {
    const { user: inst, token: instToken } = await createUser('instructor');
    const { user: student, token: stuToken } = await createUser('student');
    const course = await createCourse(inst, { isPublished: true });
    const lecture = await createLecture(course, { isPublished: true });
    await createEnrollment(student, course);

    const postRes = await request(app)
      .post(`/api/v1/discussions/lecture/${lecture._id}`)
      .set('Authorization', bearer(stuToken))
      .send({ text: 'Comment to be deleted by instructor' });
    const commentId = postRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/discussions/${commentId}`)
      .set('Authorization', bearer(instToken));
    expect(res.status).toBe(200);
  });
});
