import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor is required"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },

    isFree: {
      type: Boolean,
      default: false,
    },

    thumbnail: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    level: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Level must be beginner, intermediate, or advanced",
      },
      default: "beginner",
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    totalLectures: {
      type: Number,
      default: 0,
    },

    totalDuration: {
      type: Number, 
      default: 0,
    },

    totalEnrollments: {
      type: Number,
      default: 0,
    },

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      totalRatings: { type: Number, default: 0 },
    },

    isPublished: {
      type: Boolean,
      default: false, 
    },

    isArchived: {
      type: Boolean,
      default: false, 
    },
  },
  { timestamps: true }
);


courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ isArchived: 1 });
courseSchema.index({ tags: 1 });


courseSchema.virtual("durationInHours").get(function () {
  return (this.totalDuration / 3600).toFixed(2);
});

export const Course = mongoose.model("Course", courseSchema);