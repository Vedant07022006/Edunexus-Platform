import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: function () {
        return !this.bundle; // NEW — not required for bundle purchases
      },
    },

    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay order ID is required"],
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySignature: {
      type: String,
      default: "",
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "completed", "failed", "refunded"],
        message: "Invalid payment status",
      },
      default: "pending",
    },

    paymentMethod: {
      type: String,
      default: "",
    },

    enrollmentCreated: {
      type: Boolean,
      default: false,
    },

    // NEW — Phase 4: coupon tracking (optional, backward compatible)
    couponCode: {
      type: String,
      default: null,
    },
    originalAmount: {
      type: Number,
      default: null,
    },

    // NEW — Phase 4: bundle purchases share one bundleOrderId across
    // multiple per-course Payment docs, so refunds/lookups can group them
    bundle: {
      type: Schema.Types.ObjectId,
      ref: "Bundle",
      default: null,
    },
  },
  { timestamps: true }
);


paymentSchema.index({ user: 1 });
paymentSchema.index({ course: 1 });
// paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
