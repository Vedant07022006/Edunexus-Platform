import mongoose, { Schema } from "mongoose";

const lectureSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },

    title: {
      type: String,
      required: [true, "Lecture title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    video: {
      url: { type: String, default: "" },         
      publicId: { type: String, default: "" },    
      duration: { type: Number, default: 0 },   
    },

    order: {
      type: Number,
      required: [true, "Lecture order is required"],
      min: [1, "Order must be at least 1"],
    },
    

    isFree: {
      type: Boolean,
      default: false, 
    },

    // NEW — Phase 4: drip content. If set to a future date, the lecture
    // is locked for students (not instructors) until that date.
    releaseDate: {
      type: Date,
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    
    processingStatus: {
      type: String,
      enum: ["pending", "transcribing", "generating_quiz", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);


lectureSchema.index({ course: 1, order: 1 }); 

export const Lecture = mongoose.model("Lecture", lectureSchema);