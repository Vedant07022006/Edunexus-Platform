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

    // AI-generated key-takeaway bullets, derived from
    // transcriptText. Generated once (instructor-triggered) and cached
    // here rather than regenerated per student view.
    summary: {
      type: [String],
      default: [],
    },
    summaryStatus: {
      type: String,
      enum: ["none", "generating", "completed", "failed"],
      default: "none",
    },
  },
  { timestamps: true }
);


// transcriptSchema.index({ lecture: 1 });

export const Transcript = mongoose.model("Transcript", transcriptSchema);
