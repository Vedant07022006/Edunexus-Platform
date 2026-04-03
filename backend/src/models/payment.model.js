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
      required: [true, "Course reference is required"],
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
  },
  { timestamps: true }
);


paymentSchema.index({ user: 1 });
paymentSchema.index({ course: 1 });
// paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
