import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { User } from "./user.model.js";
import { Course } from "../course/course.model.js";
import { PendingUser } from "./pendingUser.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { generateOtp } from "../../utils/generateOtp.js";
import { sendOtpEmail, sendResetPasswordEmail } from "../../utils/email.js";

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

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

const cookieOptions = {
  ...baseCookieOptions,
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

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
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

  const hashedPassword = await bcrypt.hash(password, 12);

  // Upsert: if same email registers again (e.g. resend scenario), overwrite
  await PendingUser.findOneAndUpdate(
    { email },
    {
      fullName,
      email,
      password: hashedPassword,
      role,
      hashedOtp,
      otpExpiresAt,
      otpAttempts: 0,
    },
    { upsert: true, returnDocument: 'after' }
  );

  await sendOtpEmail(email, otp);

  return res
    .status(201)
    .json(new ApiResponse(201, { email }, "OTP sent to your email"));
});


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

  if (pending.otpAttempts >= 5) {
    throw new ApiError(429, "Too many failed OTP attempts. Please register again.");
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  if (pending.hashedOtp !== hashedOtp) {
    pending.otpAttempts += 1;
    await pending.save();
    throw new ApiError(400, "Invalid OTP");
  }

 
  await User.create({
    fullName: pending.fullName,
    email: pending.email,
    password: pending.password,
    role: pending.role,
    isVerified: true,
  });

  
  await PendingUser.deleteOne({ email });

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Email verified. You can now log in.")
    );
});


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

  // 2FA branch. Only triggers for users who opted in;
  // everyone else falls through to the original login flow unchanged.
  if (user.twoFactorEnabled) {
    const otp = generateOtp();
    // Store a SHA-256 hash — never store plaintext OTPs in the DB.
    // (Matches the pattern used for signup OTP and password-reset tokens.)
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    user.loginOtp = hashedOtp;
    user.loginOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save({ validateBeforeSave: false });
    await sendOtpEmail(user.email, otp); // send the raw OTP to the user

    return res.status(200).json(
      new ApiResponse(200, { requiresOtp: true, email: user.email }, "OTP sent to your email")
    );
  }

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


// Completes a 2FA login after loginUser sent an OTP
export const verifyLoginOtp = asyncHandler(async (req, res) => {
  let { email, otp } = req.body || {};
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");
  email = email.toLowerCase().trim();

  const user = await User.findOne({ email }).select("+loginOtp +loginOtpExpiry");
  if (!user || !user.loginOtp) throw new ApiError(400, "No pending OTP for this account");

  if (user.loginOtpExpiry < new Date()) {
    throw new ApiError(400, "OTP has expired, please log in again");
  }

  // Compare hashes — loginOtp in DB is SHA-256 of the raw OTP.
  const hashedInput = crypto.createHash("sha256").update(otp.trim()).digest("hex");
  if (user.loginOtp !== hashedInput) throw new ApiError(400, "Invalid OTP");

  user.loginOtp = null;
  user.loginOtpExpiry = null;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -resetPasswordToken -resetPasswordExpiry"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "Login successful"));
});

// Toggle 2FA from the profile page (already-authenticated request)
export const toggleTwoFactor = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { twoFactorEnabled: !!enabled },
    { returnDocument: 'after' }
  ).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, user, `Two-factor authentication ${enabled ? "enabled" : "disabled"}`)
  );
});


export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  return res
    .status(200)
    .clearCookie("accessToken", baseCookieOptions)
    .clearCookie("refreshToken", baseCookieOptions)
    .json(new ApiResponse(200, {}, "Logout successful"));
});


export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

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


export const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  email = email.toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Point to the backend-served reset page so it works even if the frontend isn't running
  const port = process.env.PORT || 8000;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const resetLink = `${backendUrl}/api/v1/users/reset-password-page/${resetToken}`;
  await sendResetPasswordEmail(user.email, resetLink);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset link sent to your email"));
});


// ─── SERVE RESET PASSWORD PAGE (GET) ───────────────────────────────────────────
// The backend serves a self-contained HTML page so the reset link always works
// as long as the backend is running (no dependency on the frontend dev server).
export const serveResetPasswordPage = (req, res) => {
  const { token } = req.params;
  const port = process.env.PORT || 8000;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password — EduNexus</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a1a;
      background-image:
        radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 60%),
        radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.08) 0%, transparent 60%);
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: rgba(30,30,53,0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 2.5rem 2rem;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 15px rgba(99,102,241,0.4);
    }
    .logo-icon svg { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .logo-text {
      font-size: 1.3rem; font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    h2 { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; text-align: center; }
    .subtitle { color: #94a3b8; font-size: 0.85rem; text-align: center; margin-bottom: 1.75rem; }
    label { display: block; color: #cbd5e1; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.4rem; }
    .input-wrap {
      position: relative; margin-bottom: 1rem;
    }
    .input-wrap input {
      width: 100%;
      padding: 0.7rem 2.5rem 0.7rem 0.85rem;
      background: rgba(15,15,35,0.6);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      color: #e2e8f0;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-wrap input:focus { border-color: #6366f1; }
    .toggle-eye {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #64748b; cursor: pointer; padding: 4px;
    }
    .toggle-eye:hover { color: #94a3b8; }
    .strength-bar { display: flex; gap: 4px; margin-bottom: 0.3rem; }
    .strength-bar div { height: 3px; flex: 1; border-radius: 3px; background: rgba(255,255,255,0.08); transition: background 0.3s; }
    .strength-label { font-size: 0.7rem; color: #64748b; margin-bottom: 1rem; }
    .btn {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      box-shadow: 0 4px 15px rgba(99,102,241,0.3);
    }
    .btn:hover { opacity: 0.92; }
    .btn:active { transform: scale(0.99); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-msg { color: #f87171; font-size: 0.78rem; margin-top: 0.3rem; }
    .back-link {
      display: block; text-align: center; margin-top: 1.25rem;
      color: #6366f1; font-size: 0.85rem; text-decoration: none;
    }
    .back-link:hover { color: #818cf8; }

    /* success & error screens */
    .result-screen { text-align: center; }
    .result-icon {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .result-icon.success { background: rgba(16,185,129,0.15); }
    .result-icon.error   { background: rgba(248,113,113,0.15); }
    .result-icon svg { width: 32px; height: 32px; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .result-icon.success svg { stroke: #34d399; }
    .result-icon.error svg   { stroke: #f87171; }
    .result-msg { color: #94a3b8; font-size: 0.85rem; margin: 0.5rem 0 1.5rem; line-height: 1.5; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <!-- FORM SCREEN -->
  <div class="card" id="formScreen">
    <div class="logo">
      <div class="logo-icon"><svg viewBox="0 0 24 24"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <span class="logo-text">EduNexus</span>
    </div>
    <h2>Set new password</h2>
    <p class="subtitle">Choose a strong password for your account</p>

    <form id="resetForm" autocomplete="off">
      <label for="newPassword">New password</label>
      <div class="input-wrap">
        <input id="newPassword" type="password" placeholder="••••••••" required minlength="8" autofocus />
        <button type="button" class="toggle-eye" id="toggleNewPwd">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <label for="confirmPassword">Confirm password</label>
      <div class="input-wrap">
        <input id="confirmPassword" type="password" placeholder="••••••••" required minlength="8" />
        <button type="button" class="toggle-eye" id="toggleConfirmPwd">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <div class="strength-bar" id="strengthBar"><div></div><div></div><div></div><div></div></div>
      <p class="strength-label" id="strengthLabel"></p>

      <p class="error-msg hidden" id="formError"></p>
      <button type="submit" class="btn" id="submitBtn">Reset Password</button>
    </form>
    <a href="${frontendUrl}/login" class="back-link">Back to login</a>
  </div>

  <!-- SUCCESS SCREEN -->
  <div class="card result-screen hidden" id="successScreen">
    <div class="logo">
      <div class="logo-icon"><svg viewBox="0 0 24 24"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <span class="logo-text">EduNexus</span>
    </div>
    <div class="result-icon success">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h2>Password reset!</h2>
    <p class="result-msg">Your password has been updated successfully.<br/>Redirecting to login in 3 seconds…</p>
    <a href="${frontendUrl}/login" class="btn" style="display:inline-block;text-align:center;text-decoration:none;">Sign in now</a>
  </div>

  <!-- ERROR SCREEN -->
  <div class="card result-screen hidden" id="errorScreen">
    <div class="logo">
      <div class="logo-icon"><svg viewBox="0 0 24 24"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <span class="logo-text">EduNexus</span>
    </div>
    <div class="result-icon error">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    </div>
    <h2>Link expired or invalid</h2>
    <p class="result-msg" id="errorMsg">This reset link has expired or is invalid. Please request a new one.</p>
    <a href="${frontendUrl}/forgot-password" class="btn" style="display:inline-block;text-align:center;text-decoration:none;margin-bottom:0.75rem;">Request a new reset link</a>
    <a href="${frontendUrl}/login" class="back-link">Back to login</a>
  </div>

  <script>
    const TOKEN = "${token}";
    const API   = "${backendUrl}/api/v1/users/reset-password/" + TOKEN;
    const FRONTEND = "${frontendUrl}";

    const formScreen    = document.getElementById('formScreen');
    const successScreen = document.getElementById('successScreen');
    const errorScreen   = document.getElementById('errorScreen');
    const formError     = document.getElementById('formError');
    const submitBtn     = document.getElementById('submitBtn');
    const newPwd        = document.getElementById('newPassword');
    const confirmPwd    = document.getElementById('confirmPassword');

    document.getElementById('toggleNewPwd').addEventListener('click', function() {
      newPwd.type = newPwd.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('toggleConfirmPwd').addEventListener('click', function() {
      confirmPwd.type = confirmPwd.type === 'password' ? 'text' : 'password';
    });

    // Strength meter
    newPwd.addEventListener('input', () => {
      const p = newPwd.value;
      let s = 0;
      if (p.length >= 8)  s++;
      if (p.length >= 12) s++;
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
      if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
      const bars = document.querySelectorAll('#strengthBar div');
      const colors = ['#ef4444','#f97316','#eab308','#10b981'];
      bars.forEach((b, i) => { b.style.background = i < s ? colors[s-1] : 'rgba(255,255,255,0.08)'; });
      document.getElementById('strengthLabel').textContent = ['','Weak','Fair','Good','Strong'][s] || '';
    });

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      formError.classList.add('hidden');

      if (newPwd.value.length < 8) {
        formError.textContent = 'Password must be at least 8 characters';
        formError.classList.remove('hidden');
        return;
      }
      if (newPwd.value !== confirmPwd.value) {
        formError.textContent = 'Passwords do not match';
        formError.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting…';

      try {
        const resp = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: newPwd.value }),
        });
        const data = await resp.json();

        if (resp.ok) {
          formScreen.classList.add('hidden');
          successScreen.classList.remove('hidden');
          setTimeout(() => { window.location.href = FRONTEND + '/login'; }, 3000);
        } else {
          const msg = data.message || 'Reset failed';
          if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
            document.getElementById('errorMsg').textContent = msg;
            formScreen.classList.add('hidden');
            errorScreen.classList.remove('hidden');
          } else {
            formError.textContent = msg;
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
          }
        }
      } catch (err) {
        formError.textContent = 'Network error. Please try again.';
        formError.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    });
  </script>
</body>
</html>`);
};


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


export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("enrolledCourses.course", "title thumbnail price level")
    .populate("createdCourses", "title thumbnail totalEnrollments isPublished");

  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile fetched successfully"));
});


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
    { returnDocument: 'after', runValidators: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});


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


export const deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  // If instructor, archive all their courses (don't delete)
  if (user.role === "instructor") {
    await Course.updateMany(
      { instructor: user._id, isArchived: false },
      { $set: { isArchived: true, isPublished: false } }
    );
  }

  // Deactivate enrollments, deactivate account, clear tokens
  await Enrollment.updateMany(
    { user: user._id, isActive: true },
    { $set: { isActive: false } }
  );

  user.isActive = false;
  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .clearCookie("accessToken", baseCookieOptions)
    .clearCookie("refreshToken", baseCookieOptions)
    .json(new ApiResponse(200, null, "Account deactivated successfully"));
});


// ─── ADMIN: RESTORE INSTRUCTOR ACCOUNT ─────────────────────────────────────────
export const restoreInstructorAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { restoreCourses = true } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (user.isActive) throw new ApiError(400, "Account is already active");

  user.isActive = true;
  await user.save({ validateBeforeSave: false });

  if (user.role === "instructor" && restoreCourses) {
    await Course.updateMany(
      { instructor: user._id, isArchived: true },
      { $set: { isArchived: false } }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Instructor account restored successfully"));
});
