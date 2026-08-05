import mongoose, { Schema } from "mongoose";

const discussionSchema = new Schema(
  {
    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: [true, "Lecture reference is required"],
    },
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
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Discussion",
      default: null,
    },
    isInstructorReply: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

discussionSchema.index({ lecture: 1, createdAt: -1 });

export const Discussion = mongoose.model("Discussion", discussionSchema);