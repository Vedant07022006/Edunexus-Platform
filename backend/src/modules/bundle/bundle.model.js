import mongoose, { Schema } from "mongoose";

const bundleSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Bundle title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courses: {
      type: [Schema.Types.ObjectId],
      ref: "Course",
      validate: {
        validator: (arr) => arr.length >= 2,
        message: "A bundle must contain at least 2 courses",
      },
    },
    price: {
      type: Number,
      required: [true, "Bundle price is required"],
      min: [0, "Price cannot be negative"],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Bundle = mongoose.model("Bundle", bundleSchema);
