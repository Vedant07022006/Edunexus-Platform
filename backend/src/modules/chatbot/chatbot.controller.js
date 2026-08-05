import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { User } from "../user/user.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import { Transcript } from "../transcript/transcript.model.js";
import Groq from "groq-sdk";

const DAILY_CHAT_LIMIT = 50;
const MAX_TRANSCRIPT_CHARS = 4000; // keep prompt size reasonable
const MAX_HISTORY_MESSAGES = 6;    // last N messages of chat history sent for context

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const trimText = (text, maxChars) =>
  text.length <= maxChars ? text : text.slice(0, maxChars) + "...";

/**
 * Checks and (if allowed) increments a user's daily chatbot message count.
 * Resets the counter automatically when the date has changed.
 * Returns { used, limit, remaining } and throws ApiError(429) if the
 * daily limit has already been reached.
 */
const consumeDailyChatQuota = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = user.lastChatDate ? new Date(user.lastChatDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const isSameDay = lastDate && lastDate.getTime() === today.getTime();
  const currentCount = isSameDay ? user.dailyChatCount : 0;

  if (currentCount >= DAILY_CHAT_LIMIT) {
    throw new ApiError(
      429,
      `Daily limit of ${DAILY_CHAT_LIMIT} messages reached. Please come back tomorrow.`
    );
  }

  user.dailyChatCount = currentCount + 1;
  user.lastChatDate = new Date();
  await user.save({ validateBeforeSave: false });

  return {
    used: currentCount + 1,
    limit: DAILY_CHAT_LIMIT,
    remaining: DAILY_CHAT_LIMIT - (currentCount + 1),
  };
};

const buildSystemPrompt = (lectureTitle, transcriptText) => `
You are a friendly, patient teaching assistant helping a student with doubts
about a specific lecture they just studied, titled "${lectureTitle}".

Use the lecture transcript below as your primary source of truth. Answer
the student's questions clearly and concisely, in plain English, as if
explaining to someone learning the topic for the first time. If a question
is unrelated to this lecture's topic, gently redirect the student back to
the lecture content rather than answering completely off-topic questions.

Keep answers focused and not overly long — a few sentences is usually
enough unless the student explicitly asks for more detail.

Lecture transcript:
"""
${trimText(transcriptText, MAX_TRANSCRIPT_CHARS)}
"""
`;

// ─── Controllers ───────────────────────────────────────────────────────────────

export const askChatbot = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId, message, history } = req.body;

  if (!lectureId) throw new ApiError(400, "lectureId is required");
  if (!message || !message.trim()) throw new ApiError(400, "Message is required");

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course) throw new ApiError(404, "Course not found");

  // Students must be enrolled (or it must be a free course/lecture) to use
  // the doubt chatbot for a given lecture — mirrors quiz access rules.
  if (!course.isFree && !lecture.isFree) {
    const { Enrollment } = await import("../enrollment/enrollment.model.js");
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      isActive: true,
    });
    if (!enrollment) throw new ApiError(403, "Enroll in this course to ask doubts about its lectures");
  }

  const transcript = await Transcript.findOne({ lecture: lectureId, status: "completed" });
  if (!transcript) {
    throw new ApiError(404, "This lecture doesn't have a transcript yet, so the doubt assistant isn't available.");
  }

  // Load full user doc (not the lean req.user from JWT) so we can update quota fields
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const quota = await consumeDailyChatQuota(user);

  const groq = getGroqClient();

  const recentHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 1000),
      }))
    : [];

  let reply;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: buildSystemPrompt(lecture.title, transcript.transcriptText) },
        ...recentHistory,
        { role: "user", content: message.trim().slice(0, 1000) },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 500,
    });

    reply = completion.choices[0]?.message?.content?.trim();
  } catch (err) {
    throw new ApiError(502, "The doubt assistant is temporarily unavailable. Please try again shortly.");
  }

  if (!reply) {
    throw new ApiError(502, "The doubt assistant couldn't generate a response. Please try again.");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      reply,
      quota,
    })
  );
});


export const getChatbotUsage = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = user.lastChatDate ? new Date(user.lastChatDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const isSameDay = lastDate && lastDate.getTime() === today.getTime();
  const used = isSameDay ? user.dailyChatCount : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      used,
      limit: DAILY_CHAT_LIMIT,
      remaining: Math.max(DAILY_CHAT_LIMIT - used, 0),
    })
  );
});
