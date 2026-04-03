import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { PendingUser } from "../models/pendingUser.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail, sendResetPasswordEmail } from "../utils/email.js";

// ─── Internal helpers ──────────────────────────────────────────────────────────

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── REGISTER ──────────────────────────────────────────────────────────────────
//
// Saves a PendingUser to MongoDB (NOT the real users collection).
// PendingUser has a TTL index and auto-deletes after OTP expiry.
// The actual User document is only created after OTP verification.
//
export const registerUser = asyncHandler(async (req, res) => {
  let { fullName, email, password, role } = req.body;

  if (!fullName || !email || !password || !role) {
    throw new ApiError(400, "All fields are required");
  }

  if (!["student", "instructor"].includes(role)) {
    throw new ApiError(400, "Role must be 'student' or 'instructor'");
  }

  email = email.toLowerCase().trim();

  // Block registration if email is already verified in the users collection
  const existingUser = await User.findOne({ email, isVerified: true });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const otp = generateOtp();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert: if same email registers again (e.g. resend scenario), overwrite
  await PendingUser.findOneAndUpdate(
    { email },
    {
      fullName,
      email,
      password,
      role,
      hashedOtp,
      otpExpiresAt,
      otpAttempts: 0,
    },
    { upsert: true, new: true }
  );

  await sendOtpEmail(email, otp);

  return res
    .status(201)
    .json(new ApiResponse(201, { email }, "OTP sent to your email"));
});

// ─── VERIFY EMAIL OTP ──────────────────────────────────────────────────────────
//
// On valid OTP: creates the User in DB, deletes the PendingUser.
// On invalid/expired OTP: increments attempt counter or deletes the PendingUser.
//
export const verifyEmailOtp = asyncHandler(async (req, res) => {
  let { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  email = email.toLowerCase().trim();

  const pending = await PendingUser.findOne({ email });

  if (!pending) {
    throw new ApiError(
      400,
      "OTP expired or not found. Please register again."
    );
  }

  if (pending.otpExpiresAt < Date.now()) {
    await PendingUser.deleteOne({ email });
    throw new ApiError(400, "OTP has expired. Please register again.");
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  if (pending.hashedOtp !== hashedOtp) {
    pending.otpAttempts += 1;
    await pending.save();
    throw new ApiError(400, "Invalid OTP");
  }

  // ✅ OTP correct — create the verified user
  await User.create({
    fullName: pending.fullName,
    email: pending.email,
    password: pending.password,
    role: pending.role,
    isVerified: true,
  });

  // Clean up the pending record
  await PendingUser.deleteOne({ email });

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Email verified. You can now log in.")
    );
});

// ─── RESEND OTP ────────────────────────────────────────────────────────────────
export const resendOtp = asyncHandler(async (req, res) => {
  let { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  email = email.toLowerCase().trim();

  const pending = await PendingUser.findOne({ email });

  if (!pending) {
    throw new ApiError(
      400,
      "Registration session expired. Please register again."
    );
  }

  if (pending.otpAttempts >= 5) {
    throw new ApiError(
      429,
      "Too many OTP attempts. Please register again later."
    );
  }

  const otp = generateOtp();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  pending.hashedOtp = hashedOtp;
  pending.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  pending.otpAttempts += 1;

  await pending.save();
  await sendOtpEmail(email, otp);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "OTP resent successfully"));
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
export const loginUser = asyncHandler(async (req, res) => {
  let { email, password } = req.body || {};

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  email = email.toLowerCase().trim();

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  if (!user.isVerified) {
    throw new ApiError(401, "Please verify your email before logging in");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -resetPasswordToken -resetPasswordExpiry"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        "Login successful"
      )
    );
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logout successful"));
});

// ─── REFRESH ACCESS TOKEN ──────────────────────────────────────────────────────
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  const decoded = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decoded._id).select("+refreshToken");

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  email = email.toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await sendResetPasswordEmail(user.email, resetLink);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset link sent to your email"));
});

// ─── RESET PASSWORD ────────────────────────────────────────────────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) throw new ApiError(400, "New password is required");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  user.refreshToken = undefined;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successful. You can now log in."));
});

// ─── GET MY PROFILE ────────────────────────────────────────────────────────────
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("enrolledCourses.course", "title thumbnail price level")
    .populate("createdCourses", "title thumbnail totalEnrollments isPublished");

  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile fetched successfully"));
});

// ─── UPDATE PROFILE ────────────────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, bio } = req.body || {};

  if (!fullName && !bio) {
    throw new ApiError(400, "At least one field (fullName or bio) is required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(fullName && { fullName }),
        ...(bio && { bio }),
      },
    },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// ─── CHANGE PASSWORD ───────────────────────────────────────────────────────────
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.isPasswordCorrect(oldPassword);
  if (!isMatch) throw new ApiError(400, "Old password is incorrect");

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// ─── DELETE MY ACCOUNT ─────────────────────────────────────────────────────────
export const deleteMyAccount = asyncHandler(async (req, res) => {
  // Soft delete — set isActive to false rather than removing from DB
  await User.findByIdAndUpdate(req.user._id, { isActive: false });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Account deactivated successfully"));
});
