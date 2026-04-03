import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "instructor"],
      required: true,
    },
    hashedOtp: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 🔥 Auto delete after expiry
pendingUserSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingUser = mongoose.model("PendingUser", pendingUserSchema);