import mongoose, { Schema } from "mongoose";

const transcriptSchema = new Schema(
  {
    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: [true, "Lecture reference is required"],
      unique: true, 
    },

    transcriptText: {
      type: String,
      required: [true, "Transcript text is required"],
    },

    
    timestamps: [
      {
        text: { type: String },
        start: { type: Number }, 
        end: { type: Number },   
        confidence: { type: Number },
      },
    ],

    language: {
      type: String,
      default: "en",
    },

    confidence: {
      type: Number, 
      default: 0,
    },

    assemblyAiId: {
      type: String, 
      default: "",
    },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
  },
  { timestamps: true }
);


// transcriptSchema.index({ lecture: 1 });

export const Transcript = mongoose.model("Transcript", transcriptSchema);