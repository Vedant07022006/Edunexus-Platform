
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  // ================= TOKEN EXTRACTION =================
  // Strategy:
  //   - If an Authorization header is present → use ONLY the Bearer token.
  //     Do NOT fall back to cookie. This prevents a leftover instructor cookie
  //     from silently overriding an explicitly provided (but empty) Bearer token.
  //   - If NO Authorization header is present → use cookie (for browser frontend).
  const authHeader = req.headers?.authorization;
  let token;

  if (authHeader) {
    // Authorization header was explicitly sent — extract Bearer token only
    token = authHeader.replace("Bearer ", "").trim();
  } else {
    // No Authorization header — fall back to cookie (browser / frontend sessions)
    token = req.cookies?.accessToken;
  }

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  let decoded;

  // ================= VERIFY TOKEN =================
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (!decoded || !decoded._id) {
    throw new ApiError(401, "Invalid token payload");
  }

  // ================= CHECK USER IN DB =================
  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  // ================= ACCOUNT STATUS CHECK =================
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email first");
  }

  // ================= ATTACH USER =================
  req.user = user;

  next();
});

export default verifyJWT;
