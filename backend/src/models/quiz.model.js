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
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: [true, "Lecture reference is required"],
      unique: true, //
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
        validator: (val) => val.length >= 1,
        message: "Quiz must have at least 1 question",
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