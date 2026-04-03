import { Router } from "express";
import {
  registerUser,
  verifyEmailOtp,
  resendOtp,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getMyProfile,
  updateProfile,
  changeCurrentPassword,
  deleteMyAccount,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { otpLimiter, loginLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();


// PUBLIC ROUTES — no token needed

router.post("/register", registerUser);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/login", loginLimiter, loginUser);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshAccessToken);


// PROTECTED ROUTES — token required

router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getMyProfile);
router.patch("/update-profile", verifyJWT, updateProfile);
router.patch("/change-password", verifyJWT, changeCurrentPassword);
router.delete("/delete-account", verifyJWT, deleteMyAccount);

export default router;