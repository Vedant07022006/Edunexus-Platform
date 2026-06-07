// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Transcript } from "../models/transcript.model.js";
// import { Lecture } from "../models/lecture.model.js";
// import { AssemblyAI } from "assemblyai";

// const getAssemblyAIClient = () => {
//   return new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
// };



// export const generateTranscript = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { lectureId } = req.params;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");
//   if (!lecture.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (lecture.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized");
//   }

//   if (!lecture.video.url) {
//     throw new ApiError(400, "Lecture video not found");
//   }

//   const existingTranscript = await Transcript.findOne({ lecture: lectureId });
//   if (existingTranscript && existingTranscript.status === "completed") {
//     return res
//       .status(200)
//       .json(new ApiResponse(200, existingTranscript, "Transcript already exists"));
//   }

//   await Lecture.findByIdAndUpdate(lectureId, {
//     processingStatus: "transcribing",
//   });

//   let transcript = await Transcript.findOneAndUpdate(
//     { lecture: lectureId },
//     { lecture: lectureId, status: "processing", transcriptText: "" },
//     { upsert: true, new: true }
//   );

//   const client = getAssemblyAIClient();

//   let result;
//   try {
//     result = await client.transcripts.transcribe({
//       audio: lecture.video.url,
//       speech_models: ["universal-2"],
//     });
//   } catch (aaiErr) {
//     await Transcript.findByIdAndUpdate(transcript._id, { status: "failed" });
//     await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "failed" });
//     throw new ApiError(
//       500,
//       `AssemblyAI error: ${aaiErr?.message || JSON.stringify(aaiErr)}`
//     );
//   }

//   if (result.status === "error") {
//     await Transcript.findByIdAndUpdate(transcript._id, { status: "failed" });
//     await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "failed" });
//     throw new ApiError(500, `Transcription failed: ${result.error}`);
//   }

//   transcript = await Transcript.findByIdAndUpdate(
//     transcript._id,
//     {
//       transcriptText: result.text,
//       status: "completed",
//       assemblyAiId: result.id,
//       confidence: result.confidence || 0,
//       language: result.language_code || "en",
//       timestamps: result.words
//         ? result.words.map((word) => ({
//             text: word.text,
//             start: word.start,
//             end: word.end,
//             confidence: word.confidence,
//           }))
//         : [],
//     },
//     { new: true }
//   );

//   await Lecture.findByIdAndUpdate(lectureId, {
//     processingStatus: "generating_quiz",
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, transcript, "Transcript generated"));
// });



// export const getTranscript = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { lectureId } = req.params;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");
//   if (!lecture.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (lecture.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized");
//   }

//   const transcript = await Transcript.findOne({ lecture: lectureId });
//   if (!transcript) {
//     throw new ApiError(404, "Transcript not found");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, transcript, "Transcript fetched"));
// });



// export const deleteTranscript = asyncHandler(async (req, res) => {
//   if (!req.user) throw new ApiError(401, "Login required");

//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { lectureId } = req.params;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");
//   if (!lecture.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (lecture.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized");
//   }

//   await Transcript.findOneAndDelete({ lecture: lectureId });

//   await Lecture.findByIdAndUpdate(lectureId, {
//     processingStatus: "pending",
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Transcript deleted"));
// });









import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Transcript } from "../models/transcript.model.js";
import { Lecture } from "../models/lecture.model.js";
import { AssemblyAI } from "assemblyai";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const getAssemblyAIClient = () => new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

/**
 * Fetches a lecture with its course, verifies the requesting user owns it.
 * Throws on any failure.
 */
const getOwnedLecture = async (lectureId, instructorId) => {
  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");
  if (!lecture.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (lecture.course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "Not authorized");
  }
  return lecture;
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const generateTranscript = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await getOwnedLecture(lectureId, req.user._id);

  if (!lecture.video?.url) throw new ApiError(400, "Lecture video not found");

  const existingTranscript = await Transcript.findOne({ lecture: lectureId });
  if (existingTranscript?.status === "completed") {
    return res
      .status(200)
      .json(new ApiResponse(200, existingTranscript, "Transcript already exists"));
  }

  // Mark lecture as transcribing
  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "transcribing" });

  // Upsert a "processing" placeholder so the UI can poll
  let transcript = await Transcript.findOneAndUpdate(
    { lecture: lectureId },
    { lecture: lectureId, status: "processing", transcriptText: "" },
    { upsert: true, new: true }
  );

  const client = getAssemblyAIClient();

  let result;
  try {
    result = await client.transcripts.transcribe({
      audio: lecture.video.url,
      speech_models: ["universal-2"],
    });
  } catch (aaiErr) {
    await Promise.all([
      Transcript.findByIdAndUpdate(transcript._id, { status: "failed" }),
      Lecture.findByIdAndUpdate(lectureId, { processingStatus: "failed" }),
    ]);
    throw new ApiError(500, `AssemblyAI error: ${aaiErr?.message || JSON.stringify(aaiErr)}`);
  }

  if (result.status === "error") {
    await Promise.all([
      Transcript.findByIdAndUpdate(transcript._id, { status: "failed" }),
      Lecture.findByIdAndUpdate(lectureId, { processingStatus: "failed" }),
    ]);
    throw new ApiError(500, `Transcription failed: ${result.error}`);
  }

  transcript = await Transcript.findByIdAndUpdate(
    transcript._id,
    {
      transcriptText: result.text,
      status: "completed",
      assemblyAiId: result.id,
      confidence: result.confidence || 0,
      language: result.language_code || "en",
      timestamps: result.words
        ? result.words.map(({ text, start, end, confidence }) => ({
            text, start, end, confidence,
          }))
        : [],
    },
    { new: true }
  );

  // Pipeline moves to quiz generation next
  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "generating_quiz" });

  return res.status(201).json(new ApiResponse(201, transcript, "Transcript generated"));
});


export const getTranscript = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  const transcript = await Transcript.findOne({ lecture: lectureId });
  if (!transcript) throw new ApiError(404, "Transcript not found");

  return res.status(200).json(new ApiResponse(200, transcript, "Transcript fetched"));
});


export const deleteTranscript = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  await Transcript.findOneAndDelete({ lecture: lectureId });
  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "pending" });

  return res.status(200).json(new ApiResponse(200, null, "Transcript deleted"));
});