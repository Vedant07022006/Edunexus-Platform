import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      uppercase: true,
      trim: true,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Coupon must be tied to a course"],
    },
    discountPercent: {
      type: Number,
      required: [true, "Discount percent is required"],
      min: [1, "Discount must be at least 1%"],
      max: [90, "Discount cannot exceed 90%"],
    },
    maxUses: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

couponSchema.index({ course: 1, code: 1 }, { unique: true });

export const Coupon = mongoose.model("Coupon", couponSchema);