/**
 * test/helpers/auth.helper.js
 * Creates verified test users and returns their JWT access tokens.
 * Bypasses the OTP email flow by directly writing to the DB.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../src/modules/user/user.model.js';

let _counter = 0;
const uid = () => ++_counter;

/**
 * Creates a verified user in the DB and returns { user, token }.
 * role: 'student' | 'instructor'
 */
export async function createUser(role = 'student', overrides = {}) {
  const n = uid();
  const email = overrides.email || `${role}${n}@test.com`;
  const password = overrides.password || 'Test1234!';
  const hashedPassword = await bcrypt.hash(password, 8);

  const user = await User.create({
    fullName:   overrides.fullName || `Test ${role} ${n}`,
    email,
    password:   hashedPassword,
    role,
    isVerified: true,   // skip OTP flow
    isActive:   true,
    ...overrides,
    // overrides.password would be plaintext; we always hash
    password: hashedPassword,
  });

  // Generate a real JWT token using the model method
  const token = user.generateAccessToken();
  return { user, token, password };
}

/**
 * Returns Bearer header string for use with supertest .set()
 */
export function bearer(token) {
  return `Bearer ${token}`;
}

/**
 * Generates an access token for an existing user object.
 * Useful when you already have a User doc and just need a fresh token.
 */
export function generateToken(user) {
  return user.generateAccessToken();
}
