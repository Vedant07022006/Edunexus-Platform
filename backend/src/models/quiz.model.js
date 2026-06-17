import mongoose, { Schema } from "mongoose";

const questionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },

    options: {
      type: [String],
      validate: {
        validator: (val) => val.length === 4,
        message: "Each question must have exactly 4 options",
      },
    },

    correctAnswer: {
      type: String,
      required: [true, "Correct answer is required"],
    },

    explanation: {
      type: String,
      default: "",
    },

    // NEW: difficulty tag — required for every question (AI or manual)
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: [true, "Difficulty is required"],
    },
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: [true, "Lecture reference is required"],
      unique: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    questions: {
      type: [questionSchema],
      validate: {
        // Every quiz must have exactly 20 questions: 5 easy, 10 medium, 5 hard.
        // This validator only runs once status is "ready" — quizzes still in
        // "generating" status are allowed to have an empty/partial array.
        validator: function (val) {
          if (this.status !== "ready") return true;

          if (val.length !== 20) return false;

          const counts = { easy: 0, medium: 0, hard: 0 };
          val.forEach((q) => {
            if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
          });

          return counts.easy === 5 && counts.medium === 10 && counts.hard === 5;
        },
        message:
          "A ready quiz must have exactly 20 questions: 5 easy, 10 medium, and 5 hard.",
      },
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    passingScore: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },

    generatedByAi: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "generating",
    },
  },
  { timestamps: true }
);


quizSchema.pre("save", async function () {
  this.totalQuestions = this.questions.length;
});


quizSchema.index({ course: 1 });

export const Quiz = mongoose.model("Quiz", quizSchema);