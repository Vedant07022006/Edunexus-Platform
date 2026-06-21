import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ["student", "instructor", "admin"],
        message: "Role must be student, instructor, or admin",
      },
      default: "student",
    },

    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },

    enrolledCourses: [
      {
        course: {
          type: Schema.Types.ObjectId,
          ref: "Course",
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    ],

    createdCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    emailOtp: {
      type: String,
      select: false,
    },

    emailOtpExpiry: {
      type: Date,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpiry: {
      type: Date,
      select: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    // NEW: AI doubt chatbot daily usage tracking (50 messages/day)
    dailyChatCount: {
      type: Number,
      default: 0,
    },

    lastChatDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


// userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ "enrolledCourses.course": 1 });


userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  // Skip hashing if already hashed (useful when passing hashed password from PendingUser)
  if (this.password.startsWith("$2b$") || this.password.startsWith("$2a$")) return;

  this.password = await bcrypt.hash(this.password, 12);
});



userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
    }
  );
};

userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

userSchema.methods.generateEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = crypto.createHash("sha256").update(otp).digest("hex");
  this.emailOtpExpiry = Date.now() + 10 * 60 * 1000;
  return otp;
};

userSchema.methods.isEnrolledIn = function (courseId) {
  return this.enrolledCourses.some(
    (e) => e.course.toString() === courseId.toString()
  );
};



userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true });
};



userSchema.virtual("enrolledCoursesCount").get(function () {
  return this.enrolledCourses.length;
});

userSchema.virtual("createdCoursesCount").get(function () {
  return this.createdCourses.length;
});

export const User = mongoose.model("User", userSchema);