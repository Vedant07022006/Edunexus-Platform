import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many OTP requests. Please wait 1 minute.",
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
});