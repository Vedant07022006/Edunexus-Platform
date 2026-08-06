import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Transcript } from "./transcript.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { AssemblyAI } from "assemblyai";
import { getGroqClient, trimTranscript, parseAiJsonResponse } from "../../utils/groq.js";
import { getOwnedLecture } from "../lecture/lecture.service.js";

// ─── Ownership helper ───────────────────────────────────────────────────────────
// Re-exported from lecture.service — kept here as a named const for clarity
// (transcript operations require owning the lecture's parent course).

const getAssemblyAIClient = () => new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

// Strips markdown code fences some models wrap JSON responses in, then parses.
const parseSummaryResponse = (raw) => {
  return parseAiJsonResponse(
    raw,
    (parsed) => {
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new ApiError(500, "AI did not return a valid list of takeaways. Please try again.");
      }
    },
    "AI returned invalid summary content. Please try again."
  )
    .map((point) => (typeof point === "string" ? point.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
};

const buildSummaryPrompt = (transcriptText) => `
You are creating short study notes for a student who just watched a video lecture.
Read the transcript below and extract the 3 to 5 most important key takeaways.

Rules:
- Return ONLY a JSON array of strings, nothing else — no markdown, no preamble, no explanation.
- Each string should be one concise, self-contained takeaway (max ~25 words).
- Focus on concepts, definitions, and conclusions — skip filler/small talk from the transcript.
- Example valid output: ["Point one.", "Point two.", "Point three."]

Transcript:
"""
${transcriptText}
"""
`.trim();

const generateSummaryWithAi = async (transcriptText) => {
  const trimmed = trimTranscript(transcriptText);
  const groq = getGroqClient();

  const callAi = async () => {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: buildSummaryPrompt(trimmed) }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 500,
    });
    const text = completion.choices[0]?.message?.content || "";
    return parseSummaryResponse(text);
  };

  try {
    return await callAi();
  } catch {
    // one retry, matching the quiz-generation resilience pattern
    return await callAi();
  }
};

/**
 * Fetches a lecture with its course, verifies the requesting user owns it.
 * Throws on any failure.
 */


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
    { upsert: true, returnDocument: 'after' }
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
    { returnDocument: 'after' }
  );

  // Pipeline moves to quiz generation next
  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "generating_quiz" });

  return res.status(201).json(new ApiResponse(201, transcript, "Transcript generated"));
});


// Generate-once lecture summary, instructor-triggered (generate → store → serve statically).
export const generateSummary = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  const transcript = await Transcript.findOne({ lecture: lectureId });
  if (!transcript || transcript.status !== "completed") {
    throw new ApiError(400, "Generate the transcript first before generating a summary");
  }

  // Return existing summary instead of regenerating
  if (transcript.summaryStatus === "completed" && transcript.summary.length > 0) {
    return res.status(200).json(new ApiResponse(200, transcript, "Summary already exists"));
  }

  await Transcript.findByIdAndUpdate(transcript._id, { summaryStatus: "generating" });

  let summary;
  try {
    summary = await generateSummaryWithAi(transcript.transcriptText);
  } catch (err) {
    await Transcript.findByIdAndUpdate(transcript._id, { summaryStatus: "failed" });
    throw err;
  }

  const updated = await Transcript.findByIdAndUpdate(
    transcript._id,
    { summary, summaryStatus: "completed" },
    { returnDocument: 'after' }
  );

  return res.status(201).json(new ApiResponse(201, updated, "Summary generated"));
});


export const getTranscript = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  const transcript = await Transcript.findOne({ lecture: lectureId });
  if (!transcript) throw new ApiError(404, "Transcript not found");

  return res.status(200).json(new ApiResponse(200, transcript, "Transcript fetched"));
});


// NEW: read-only transcript access for students (search + jump-to-timestamp
// feature in the lecture player). Access rules mirror getQuizByLecture —
// instructor, free course, or an actively enrolled student.
export const getTranscriptForViewer = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course?.instructor) throw new ApiError(404, "This course is no longer available");

  const isInstructor = course.instructor.toString() === req.user._id.toString();

  if (!isInstructor && !course.isFree && !lecture.isFree) {
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      isActive: true,
    });

    if (!enrollment) throw new ApiError(403, "Enroll to access this lecture's transcript");
  }

  const transcript = await Transcript.findOne({ lecture: lectureId, status: "completed" })
    .select("transcriptText timestamps language summary summaryStatus"); // summary fields NEW

  if (!transcript) throw new ApiError(404, "Transcript not available for this lecture");

  return res.status(200).json(new ApiResponse(200, transcript, "Transcript fetched"));
});


export const deleteTranscript = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  await Transcript.findOneAndDelete({ lecture: lectureId });
  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "pending" });

  return res.status(200).json(new ApiResponse(200, null, "Transcript deleted"));
});
