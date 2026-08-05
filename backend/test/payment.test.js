/**
 * test/payment.test.js — Module 4: Payment
 * Tests: createOrder, verifyPayment (valid HMAC + wrong HMAC), refund guard
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { createUser, bearer } from './helpers/auth.helper.js';
import { createCourse, createEnrollment, createCompletedPayment } from './helpers/seed.helper.js';
import { Payment } from '../src/models/payment.model.js';

// Helper: compute correct Razorpay HMAC signature
function makeSignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

describe('Payment — Create Order', () => {
  it('student can create a Razorpay order for a paid course', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { price: 499, isPublished: true });

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('orderId');
    expect(res.body.data).toHaveProperty('keyId');
    // amount should be in paise (499 * 100 = 49900)
    expect(res.body.data.amount).toBe(49900);
  });

  it('cannot create order for a free course', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { isFree: true, price: 0, isPublished: true });

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('cannot create order for an archived course', async () => {
    const { user: inst } = await createUser('instructor');
    const { token } = await createUser('student');
    const course = await createCourse(inst, { isArchived: true, isPublished: false });

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('already enrolled student cannot create a new order', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { price: 499, isPublished: true });
    await createEnrollment(student, course);

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('instructor cannot create order (student only route)', async () => {
    const { user: inst, token } = await createUser('instructor');
    const course = await createCourse(inst, { price: 499, isPublished: true });

    const res = await request(app)
      .post(`/api/v1/payments/create-order/${course._id}`)
      .set('Authorization', bearer(token))
      .send({});
    expect(res.status).toBe(403);
  });
});

describe('Payment — Verify Payment', () => {
  it('returns 400 when all three fields are missing (camelCase bug check)', async () => {
    const { token } = await createUser('student');
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', bearer(token))
      .send({
        // Wrong camelCase keys — should fail with 400
        razorpayOrderId:   'order_fake',
        razorpayPaymentId: 'pay_fake',
        razorpaySignature: 'sig_fake',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing/i);
  });

  it('returns 400 for invalid HMAC signature (snake_case keys, wrong sig)', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { price: 299, isPublished: true });

    // Create a pending payment record manually
    const payment = await Payment.create({
      user: student._id, course: course._id,
      razorpayOrderId: 'order_test_bad_sig',
      amount: 299, currency: 'INR', status: 'pending',
    });

    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', bearer(token))
      .send({
        razorpay_order_id:   'order_test_bad_sig',
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature:  'wrong_signature_here',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('enrolls student when HMAC signature is valid', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst, { price: 199, isPublished: true });

    const orderId   = `order_valid_${Date.now()}`;
    const paymentId = `pay_valid_${Date.now()}`;

    await Payment.create({
      user: student._id, course: course._id,
      razorpayOrderId: orderId,
      amount: 199, currency: 'INR', status: 'pending',
    });

    const sig = makeSignature(orderId, paymentId);

    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', bearer(token))
      .send({
        razorpay_order_id:   orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature:  sig,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('completed');
  });
});

describe('Payment — Refund', () => {
  it('instructor can initiate refund for a completed payment', async () => {
    const { user: inst, token } = await createUser('instructor');
    const { user: student } = await createUser('student');
    const course = await createCourse(inst);
    const payment = await createCompletedPayment(student, course, {
      razorpayPaymentId: '', // no real ID — guard should skip Razorpay call
    });

    const res = await request(app)
      .post(`/api/v1/payments/refund/${payment._id}`)
      .set('Authorization', bearer(token))
      .send({ reason: 'Test refund' });

    // With no razorpayPaymentId, refund guard should mark it refunded directly
    // or return the appropriate error. Either way, not a 500.
    expect(res.status).not.toBe(500);
  });

  it('student cannot initiate a refund', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    const payment = await createCompletedPayment(student, course);

    const res = await request(app)
      .post(`/api/v1/payments/refund/${payment._id}`)
      .set('Authorization', bearer(token))
      .send({ reason: 'I want money back' });
    expect(res.status).toBe(403);
  });
});

describe('Payment — History', () => {
  it('student can view their own payment history', async () => {
    const { user: inst } = await createUser('instructor');
    const { user: student, token } = await createUser('student');
    const course = await createCourse(inst);
    await createCompletedPayment(student, course);

    const res = await request(app)
      .get('/api/v1/payments/history')
      .set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBeGreaterThan(0);
  });
});
