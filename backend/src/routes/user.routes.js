import { Router } from "express";
import {
  registerUser,
  verifyEmailOtp,
  resendOtp,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  serveResetPasswordPage,
  resetPassword,
  getMyProfile,
  updateProfile,
  changeCurrentPassword,
  deleteMyAccount,
  restoreInstructorAccount,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import { otpLimiter, loginLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();


// PUBLIC ROUTES — no token needed

router.post("/register", registerUser);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/login", loginLimiter, loginUser);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.get("/reset-password-page/:token", serveResetPasswordPage);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshAccessToken);


// PROTECTED ROUTES — token required

router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getMyProfile);
router.patch("/update-profile", verifyJWT, updateProfile);
router.patch("/change-password", verifyJWT, changeCurrentPassword);
router.delete("/delete-account", verifyJWT, deleteMyAccount);


// ADMIN ROUTES

router.patch("/admin/restore-account/:userId", verifyJWT, isAdmin, restoreInstructorAccount);

export default router;