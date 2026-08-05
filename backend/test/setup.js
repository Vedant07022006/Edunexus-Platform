/**
 * test/setup.js
 * Global setup for the EduNexus backend test suite.
 * - Sets dummy env vars so no real .env is needed
 * - Starts an in-memory MongoDB server before any test runs
 * - Clears all collections between test files
 * - Stops the server after all tests are done
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// ── 1. Dummy env vars (set before any module imports that read them) ──────────
process.env.NODE_ENV              = 'test';
process.env.ACCESS_TOKEN_SECRET   = 'test_access_secret_32chars_minimum!';
process.env.REFRESH_TOKEN_SECRET  = 'test_refresh_secret_32chars_minimum!';
process.env.ACCESS_TOKEN_EXPIRY   = '1d';
process.env.REFRESH_TOKEN_EXPIRY  = '10d';
process.env.RAZORPAY_KEY_ID       = 'rzp_test_TESTKEY';
process.env.RAZORPAY_KEY_SECRET   = 'test_razorpay_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY    = '123456789';
process.env.CLOUDINARY_API_SECRET = 'test_cloudinary_secret';
process.env.EMAIL_USER            = 'test@test.com';
process.env.EMAIL_PASS            = 'test_pass';
process.env.CORS_ORIGIN           = '*';

// ── 2. Mock modules that make real external API calls ─────────────────────────

// Mock Nodemailer — includes verify() so getTransporter() succeeds
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify:   vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  },
}));

// Mock the cloudinary UTILITY MODULE directly so uploadVideoOnCloudinary and
// uploadThumbnailOnCloudinary never touch the real Cloudinary API or the
// local filesystem (no fs.unlinkSync, no real uploads).
// This is better than mocking the `cloudinary` package because it also avoids
// multer-related fs issues and is more robust.
vi.mock('../src/utils/cloudinary.js', () => ({
  uploadVideoOnCloudinary: vi.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/video/test.mp4',
    public_id:  'edunexus/videos/test_video',
    duration:   300,
    format:     'mp4',
    bytes:      1024000,
  }),
  uploadThumbnailOnCloudinary: vi.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/image/thumb.jpg',
    public_id:  'edunexus/thumbnails/test_thumb',
  }),
  uploadResourceOnCloudinary: vi.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/raw/resource.pdf',
    public_id:  'edunexus/resources/test_resource',
  }),
  deleteFromCloudinary: vi.fn().mockResolvedValue({ result: 'ok' }),
  getPublicIdFromUrl:   vi.fn((url) => url || null),
  getVideoThumbnailUrl: vi.fn(() => 'https://res.cloudinary.com/test/thumb.jpg'),
}));

// Mock Razorpay — orders.create() returns a fake order so no real API call is made
vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: {
      create: vi.fn().mockImplementation(({ amount, currency }) =>
        Promise.resolve({
          id:      `order_mock_${Date.now()}`,
          amount,
          currency,
          receipt: `receipt_${Date.now()}`,
          status:  'created',
        })
      ),
    },
    payments: {
      refund: vi.fn().mockResolvedValue({ id: `rfnd_mock_${Date.now()}`, status: 'processed' }),
      fetch:  vi.fn().mockResolvedValue({ id: 'pay_mock', amount: 49900, status: 'captured' }),
    },
  })),
}));

vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify(
                Array.from({ length: 20 }, (_, i) => ({
                  question:      `Test question ${i + 1}?`,
                  options:       ['Option A', 'Option B', 'Option C', 'Option D'],
                  correctAnswer: 0,
                  explanation:   'Test explanation',
                  difficulty:    i < 5 ? 'easy' : i < 15 ? 'medium' : 'hard',
                }))
              ),
            },
          }],
        }),
      },
    },
  })),
}));

// Mock AssemblyAI
vi.mock('assemblyai', () => ({
  AssemblyAI: vi.fn().mockImplementation(() => ({
    transcripts: {
      transcribe: vi.fn().mockResolvedValue({ text: 'This is a test transcript.' }),
    },
  })),
}));

// ── 3. In-memory MongoDB ──────────────────────────────────────────────────────
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 60000);

afterEach(async () => {
  // Clear all collections between tests so state doesn't leak
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);
