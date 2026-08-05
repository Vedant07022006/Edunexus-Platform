import mongoose, { Schema } from "mongoose";

const enrollmentSchema = new Schema(
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

    isActive: {
      type: Boolean,
      default: true, 
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completedLectures: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lecture",
      },
    ],

    completedAt: {
      type: Date,
      default: null, 
    },

    lastWatchedLecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      default: null, 
    },

    // NEW: exact playback position (in seconds) within lastWatchedLecture,
    // so a student resumes exactly where they left off instead of at 0:00.
    lastWatchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);


enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });


enrollmentSchema.virtual("isCompleted").get(function () {
  return this.progress === 100;
});

export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
