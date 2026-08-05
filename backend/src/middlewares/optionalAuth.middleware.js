import jwt from "jsonwebtoken";
import { User } from "../modules/user/user.model.js";


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
    
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
     
      return next();
    }

    if (!decoded?._id) {
      
      return next();
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
     
      return next();
    }

    if (!user.isActive || !user.isVerified) {
      
      return next();
    }

    
    req.user = user;
    return next();
  } catch (err) {
    
    console.error("[optionalAuth] Unexpected error:", err.message);
    return next();
  }
};

export default optionalAuth;
