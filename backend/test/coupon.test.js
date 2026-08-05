/**
 * test/coupon.test.js — Module 5: Coupons
 * Tests: Create, List, Delete, Validate (valid/expired/maxUses), Apply on Order
 */

import { vi } from 'vitest';
vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: {
      create: vi.fn().mockImplementation(({ amount, currency }) =>
        Promise.resolve({
          id:      `order_coupon_${Date.now()}`,
          amount,
          currency,
          receipt: `receipt_${Date.now()}`,
          status:  'created',
        })
      ),
    },
    payments: {
      refund: vi.fn().mockResolvedValue({ id: 'rfnd_mock', status: 'processed' }),
      fetch:  vi.fn().mockResolvedValue({ id: 'pay_mock', amount: 50000, status: 'captured' }),
    },
  })),
}));

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createCoupon } from './helpers/seed.helper.js';

describe('Coupon — Create', () => {
  it('instructor can create a coupon for their course', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst);

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ code: 'SAVE30', discountPercent: 30 });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('SAVE30');
    expect(res.body.data.discountPercent).toBe(30);
  });

  it('cannot create duplicate coupon code for the same course', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst);
    await createCoupon(inst, course, { code: 'DUPL10' });

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ code: 'DUPL10', discountPercent: 10 });
    expect(res.status).toBe(400);
  });

  it('student cannot create a coupon', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst);

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ code: 'STUDENT', discountPercent: 20 });
    expect(res.status).toBe(403);
  });
});

describe('Coupon — List', () => {
  it('instructor can list coupons for their course', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst);
    await createCoupon(inst, course, { code: 'LIST10' });

    const res = await request(app)
      .get(`/api/v1/coupons/course/${course._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.coupons.length).toBeGreaterThan(0);
  });
});

describe('Coupon — Delete', () => {
  it('instructor can delete their own coupon', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst);
    const coupon = await createCoupon(inst, course, { code: 'DEL10' });

    const res = await request(app)
      .delete(`/api/v1/coupons/${coupon._id}`)
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
  });

  it('another instructor cannot delete a coupon they do not own', async () => {
    const { user: owner } = await createUser('instructor');
    const { token: otherToken } = await createUser('instructor');
    const course = await createCourse(owner);
    const coupon = await createCoupon(owner, course, { code: 'NOTOWN' });

    const res = await request(app)
      .delete(`/api/v1/coupons/${coupon._id}`)
      .set('Authorization', bearer(otherToken));
    expect(res.status).toBe(403);
  });
});

describe('Coupon — Validate', () => {
  it('returns discountedPrice for a valid coupon', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 1000 });
    await createCoupon(inst, course, { code: 'VALID20', discountPercent: 20 });

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}/validate`)
      .set('Authorization', bearer(token))
      .send({ code: 'VALID20' });
    expect(res.status).toBe(200);
    expect(res.body.data.discountPercent).toBe(20);
    expect(res.body.data.discountedPrice).toBe(800); // 1000 - 20%
  });

  it('returns 400 for an expired coupon', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 500 });
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
    await createCoupon(inst, course, { code: 'EXPIRED', expiresAt: pastDate });

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}/validate`)
      .set('Authorization', bearer(token))
      .send({ code: 'EXPIRED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('returns 400 when coupon maxUses is reached', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 500 });
    await createCoupon(inst, course, { code: 'MAXOUT', maxUses: 5, usedCount: 5 });

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}/validate`)
      .set('Authorization', bearer(token))
      .send({ code: 'MAXOUT' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/limit|usage/i);
  });

  it('returns 404 for a non-existent coupon code', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 300 });

    const res = await request(app)
      .post(`/api/v1/coupons/course/${course._id}/validate`)
      .set('Authorization', bearer(token))
      .send({ code: 'GHOST99' });
    expect(res.status).toBe(404);
  });

  it('createOrder applies coupon discount — amount in paise matches discounted price', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 1000, isPublished: true });
    await createCoupon(inst, course, { code: 'APPLY50', discountPercent: 50 });

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({ couponCode: 'APPLY50' });
    expect(res.status).toBe(200);
    // 1000 - 50% = 500 → 50000 paise
    expect(res.body.data.amount).toBe(50000);
    expect(res.body.data.discountApplied).toBe(50);
  });
});
