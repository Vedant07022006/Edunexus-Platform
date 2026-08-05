
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../modules/user/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  
  const authHeader = req.headers?.authorization;
  let token;

  if (authHeader) {
    
    token = authHeader.replace("Bearer ", "").trim();
  } else {
    
    token = req.cookies?.accessToken;
  }

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  let decoded;

 
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (!decoded || !decoded._id) {
    throw new ApiError(401, "Invalid token payload");
  }

 
  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }


  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email first");
  }

  
  req.user = user;

  next();
});

export default verifyJWT;
