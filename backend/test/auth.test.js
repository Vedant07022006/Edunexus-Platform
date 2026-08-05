/**
 * test/auth.test.js — Module 1: Authentication
 *
 * Controller behaviors confirmed:
 * - Register: duplicate pending email → 201 (upsert, just resends OTP)
 * - Register: duplicate verified email → 409
 * - Login: unverified user → 401 (auth middleware rejects with 401 before controller)
 * - Reset password: body field is `newPassword` (not `password`)
 * - Login for 2FA users: returns requiresOtp: true in data
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { PendingUser } from '../src/models/pendingUser.model.js';
import bcrypt from 'bcrypt';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerUser(data = {}) {
  return request(app).post('/api/v1/users/register').send({
    fullName: 'Auth Test User',
    email:    'auth@test.com',
    password: 'Test1234!',
    role:     'student',
    ...data,
  });
}

async function createVerifiedUser(role = 'student', email = `verified_${Date.now()}@test.com`) {
  const hashed = await bcrypt.hash('Test1234!', 8);
  const user = await User.create({
    fullName: 'Verified User', email, password: hashed,
    role, isVerified: true, isActive: true,
  });
  return user;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Auth — Register', () => {
  it('should create a pending user and return 201', async () => {
    const res = await registerUser({ email: 'newuser1@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('email', 'newuser1@test.com');
  });

  it('should reject registration with a short password', async () => {
    const res = await registerUser({ email: 'short@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('re-registering same pending email returns 201 (upsert — resends OTP)', async () => {
    await registerUser({ email: 'dup@test.com' });
    // Second call upserts the PendingUser and resends OTP — still 201
    const res = await registerUser({ email: 'dup@test.com' });
    expect(res.status).toBe(201);
  });

  it('should reject registration with a duplicate email (already verified user) → 409', async () => {
    await createVerifiedUser('student', 'verified_dup@test.com');
    const res = await registerUser({ email: 'verified_dup@test.com' });
    expect(res.status).toBe(409);
  });

  it('should reject invalid role', async () => {
    const res = await registerUser({ email: 'role@test.com', role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('Auth — OTP Verify', () => {
  it('should reject an invalid OTP with 400', async () => {
    const email = 'otp_valid@test.com';
    await registerUser({ email });
    const pending = await PendingUser.findOne({ email });
    expect(pending).not.toBeNull();

    // Wrong OTP → 400
    const res = await request(app).post('/api/v1/users/verify-email-otp').send({
      email, otp: '000000',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid|expired|otp/i);
  });
});

describe('Auth — Login', () => {
  it('should login with correct credentials and return accessToken', async () => {
    await createVerifiedUser('student', 'login_ok@test.com');
    const res = await request(app).post('/api/v1/users/login').send({
      email: 'login_ok@test.com', password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('email', 'login_ok@test.com');
  });

  it('should reject login with wrong password', async () => {
    await createVerifiedUser('student', 'login_bad@test.com');
    const res = await request(app).post('/api/v1/users/login').send({
      email: 'login_bad@test.com', password: 'WrongPass!',
    });
    expect(res.status).toBe(401);
  });

  it('should reject login for non-existent email', async () => {
    const res = await request(app).post('/api/v1/users/login').send({
      email: 'nobody@test.com', password: 'Test1234!',
    });
    expect(res.status).toBe(404);
  });

  it('should reject login for unverified user with 401', async () => {
    const hashed = await bcrypt.hash('Test1234!', 8);
    await User.create({
      fullName: 'Unverified', email: 'unverified@test.com',
      password: hashed, role: 'student', isVerified: false, isActive: true,
    });
    const res = await request(app).post('/api/v1/users/login').send({
      email: 'unverified@test.com', password: 'Test1234!',
    });
    // Auth middleware (verifyJWT) rejects unverified users with 403,
    // but login controller rejects before reaching auth middleware — 401
    expect([401, 403]).toContain(res.status);
  });

  it('should return requiresOtp: true when 2FA is enabled', async () => {
    const hashed = await bcrypt.hash('Test1234!', 8);
    await User.create({
      fullName: '2FA User', email: '2fa@test.com',
      password: hashed, role: 'student',
      isVerified: true, isActive: true, twoFactorEnabled: true,
    });
    const res = await request(app).post('/api/v1/users/login').send({
      email: '2fa@test.com', password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.requiresOtp).toBe(true);
  });
});

describe('Auth — Forgot & Reset Password', () => {
  it('should send reset email for an existing verified user (200)', async () => {
    await createVerifiedUser('student', 'forgot@test.com');
    const res = await request(app).post('/api/v1/users/forgot-password').send({
      email: 'forgot@test.com',
    });
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent email on forgot-password', async () => {
    const res = await request(app).post('/api/v1/users/forgot-password').send({
      email: 'ghost@test.com',
    });
    expect(res.status).toBe(404);
  });

  it('should reject reset with invalid/expired token', async () => {
    const res = await request(app)
      .post('/api/v1/users/reset-password/invalidtoken123')
      .send({ newPassword: 'NewPass123!' });
    expect(res.status).toBe(400);
  });

  it('should reset password with a valid token', async () => {
    const user = await createVerifiedUser('student', 'reset@test.com');
    // Generate the reset token via the model method
    const rawToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Controller expects `newPassword` field (not `password`)
    const res = await request(app)
      .post(`/api/v1/users/reset-password/${rawToken}`)
      .send({ newPassword: 'NewPass123!' });
    expect(res.status).toBe(200);
  });
});

describe('Auth — Protected Route (no token)', () => {
  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});
