import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * optionalAuth — soft authentication middleware.
 *
 * Rules:
 *  - No token present         → req.user = undefined, call next()
 *  - Token invalid/expired    → req.user = undefined, call next() (treat as guest)
 *  - User deleted from DB     → req.user = undefined, call next() (treat as guest)
 *  - Account deactivated      → req.user = undefined, call next() (treat as guest)
 *  - Account not verified     → req.user = undefined, call next() (treat as guest)
 *  - Valid token + valid user → req.user = user, call next()
 *
 * NOTE: This middleware NEVER returns a hard error response.
 * The controller is responsible for deciding what access level to grant
 * based on whether req.user is set or not.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    let token;

    if (authHeader) {
      token = authHeader.replace("Bearer ", "").trim();
    } else {
      token = req.cookies?.accessToken;
    }


    if (!token) {
      // No token — guest request, continue
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      // Token is expired or tampered — treat as guest, continue
      return next();
    }

    if (!decoded?._id) {
      // Malformed payload — treat as guest, continue
      return next();
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // User was deleted from DB — treat as guest, continue
      return next();
    }

    if (!user.isActive || !user.isVerified) {
      // Deactivated or unverified — treat as guest, continue
      return next();
    }

    // ✅ Valid authenticated user
    req.user = user;
    return next();
  } catch (err) {
    // Unexpected DB or runtime error — fail silently, treat as guest
    console.error("[optionalAuth] Unexpected error:", err.message);
    return next();
  }
};

export default optionalAuth;
