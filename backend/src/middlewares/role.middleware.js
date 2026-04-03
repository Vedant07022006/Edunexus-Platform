import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";


export const authorizeRoles = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Only ${roles.join(" or ")} can perform this action.`
      );
    }

    next();
  });
};



export const isStudent = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (req.user.role !== "student") {
    throw new ApiError(403, "Access denied. Students only.");
  }

  next();
});


export const isInstructor = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (req.user.role !== "instructor") {
    throw new ApiError(403, "Access denied. Instructors only.");
  }

  next();
});


export const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admins only.");
  }

  next();
});


export const isInstructorOrAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (!["instructor", "admin"].includes(req.user.role)) {
    throw new ApiError(403, "Access denied. Instructors or Admins only.");
  }

  next();
});
