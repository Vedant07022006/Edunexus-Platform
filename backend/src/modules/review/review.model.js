import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// One review per student per course — resubmitting updates the existing one
reviewSchema.index({ course: 1, user: 1 }, { unique: true });
reviewSchema.index({ course: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
