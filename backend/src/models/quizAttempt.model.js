import mongoose, { Schema } from "mongoose";

const answerSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    selectedAnswer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },

    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz reference is required"],
    },

    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    answers: [answerSchema],

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalCorrect: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    isPassed: {
      type: Boolean,
      default: false,
    },

    attemptNumber: {
      type: Number,
      default: 1,
    },

    timeTakenInSeconds: {
      type: Number,
      default: 0,
    },

    // NEW: anti-cheat tracking, populated by the dedicated quiz page
    tabSwitchCount: {
      type: Number,
      default: 0,
    },

    isAutoSubmitted: {
      type: Boolean,
      default: false,
    },

    autoSubmitReason: {
      type: String,
      enum: ["timer_expired", "tab_switch_limit", "fullscreen_exit", null],
      default: null,
    },

    flaggedQuestions: {
      type: [Schema.Types.ObjectId],
      default: [],
    },

    // NEW — Phase 2: on-demand, student-triggered personalized feedback
    // based on which questions they got wrong. Generated once and cached.
    weakSpotReview: {
      type: [String],
      default: [],
    },
    weakSpotStatus: {
      type: String,
      enum: ["none", "generating", "completed", "failed"],
      default: "none",
    },
  },
  { timestamps: true }
);


quizAttemptSchema.index({ user: 1, quiz: 1 });
quizAttemptSchema.index({ course: 1 });
quizAttemptSchema.index({ score: -1 });

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);