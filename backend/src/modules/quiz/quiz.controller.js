import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { Quiz } from "./quiz.model.js";
import { Course } from "../course/course.model.js";
import { Transcript } from "../transcript/transcript.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { getGroqClient, trimTranscript } from "../../utils/groq.js";
import { getOwnedLecture } from "../lecture/lecture.service.js";

const TOTAL_QUESTIONS  = 20;
const EASY_COUNT       = 5;
const MEDIUM_COUNT     = 10;
const HARD_COUNT       = 5;
const DAILY_AI_LIMIT   = 5; // per course, per day



// The prompt explicitly handles transcripts in ANY language (Hindi, Tamil, etc.)
// by instructing the model to first understand the content, then ALWAYS
// produce the quiz in English regardless of the source language.
const buildPrompt = (transcriptText, isDifferent = false) => `
You are an expert quiz generator for an online learning platform.

IMPORTANT LANGUAGE INSTRUCTION:
The lecture transcript below may be in any language — English, Hindi, or any
other language, and may include mixed languages (Hinglish). First fully read
and understand the transcript regardless of its language. Then generate the
ENTIRE quiz output — all question text, all options, and all explanations —
strictly in clear, grammatically correct ENGLISH. Do not output any text in
the original language. Do not leave any field untranslated.

Transcript:
"""
${transcriptText}
"""

Generate EXACTLY ${TOTAL_QUESTIONS} multiple choice questions split by difficulty:
- ${EASY_COUNT} questions with difficulty "easy"
- ${MEDIUM_COUNT} questions with difficulty "medium"
- ${HARD_COUNT} questions with difficulty "hard"

Requirements for every question:
- Exactly 4 options, only one correct
- Questions must be based on concepts actually present in the transcript
- Use proper English grammar and spelling — no broken sentences
- Never output placeholder text like "Placeholder question" or generic
  options like "Option A" — every option must be a real, meaningful answer
- Include a short, clear explanation (1-2 sentences) for the correct answer
- Tag each question with its difficulty: "easy", "medium", or "hard"
${isDifferent ? "- Make these questions different from any previous quiz on this topic\n" : ""}
Return ONLY a valid JSON array, with no extra commentary, in this exact format:
[
  {
    "questionText": "Question here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": "Option A text",
    "explanation": "Explanation here",
    "difficulty": "easy"
  }
]`;

const parseQuizResponse = (text) => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError(500, "Failed to parse quiz response from AI");
  }
};

// Detects obviously broken / placeholder AI output so we can retry instead
// of saving garbage questions (this is what was happening with Hindi input).
const looksLikePlaceholder = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) return true;

  return questions.some((q) => {
    const text = (q.questionText || "").toLowerCase();
    const opts = (q.options || []).map((o) => (o || "").toLowerCase().trim());

    const hasPlaceholderText = text.includes("placeholder");
    const hasPlaceholderOptions = opts.some((o) =>
      ["option a", "option b", "option c", "option d"].includes(o)
    );

    return hasPlaceholderText || hasPlaceholderOptions;
  });
};

const validateQuestionSet = (questions) => {
  if (!Array.isArray(questions) || questions.length !== TOTAL_QUESTIONS) return false;

  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    if (!q.difficulty || !counts.hasOwnProperty(q.difficulty)) return false;
    counts[q.difficulty]++;
  }

  return counts.easy === EASY_COUNT && counts.medium === MEDIUM_COUNT && counts.hard === HARD_COUNT;
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

// getOwnedLecture is imported from lecture.service.js

/**
 * Finds a lecture + its completed transcript in one call, verifying
 * instructor ownership. Used by quiz generation endpoints.
 */
const getOwnedLectureWithTranscript = async (lectureId, instructorId) => {
  const lecture = await getOwnedLecture(lectureId, instructorId);

  const transcript = await Transcript.findOne({ lecture: lectureId, status: "completed" });
  if (!transcript) throw new ApiError(404, "Completed transcript not found. Generate a transcript first.");

  return { lecture, transcript };
};

/**
 * Checks and (if allowed) increments a course's daily AI quiz generation
 * counter. Resets the counter automatically when the date has changed.
 * Throws ApiError(429) if the daily limit has already been reached.
 */
const consumeDailyAiQuota = async (course) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = course.aiQuizGenerationsDate
    ? new Date(course.aiQuizGenerationsDate)
    : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const isSameDay = lastDate && lastDate.getTime() === today.getTime();
  const currentCount = isSameDay ? course.aiQuizGenerationsToday : 0;

  if (currentCount >= DAILY_AI_LIMIT) {
    throw new ApiError(
      429,
      `Daily AI quiz generation limit (${DAILY_AI_LIMIT}) reached for this course. ` +
      `Please add the quiz manually or try again after 24 hours.`
    );
  }

  course.aiQuizGenerationsToday = currentCount + 1;
  course.aiQuizGenerationsDate  = new Date();
  await course.save();

  return {
    used:      currentCount + 1,
    limit:     DAILY_AI_LIMIT,
    remaining: DAILY_AI_LIMIT - (currentCount + 1),
  };
};

/**
 * Calls Groq to generate the 20-question quiz set, retrying once
 * automatically if the first response looks like garbage/placeholder
 * output (common when the source transcript is in a non-English language
 * and the model fails to translate properly on the first try).
 */
const generateQuestionsWithAi = async (transcriptText, isDifferent = false) => {
  const trimmed = trimTranscript(transcriptText, 6000);
  const groq = getGroqClient();

  const callAi = async () => {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: buildPrompt(trimmed, isDifferent) }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 8000,
    });

    const text = completion.choices[0]?.message?.content || "";
    return parseQuizResponse(text);
  };

  let questions = await callAi();

  // Retry once if the output looks broken/placeholder or the 5/10/5 split is wrong
  if (looksLikePlaceholder(questions) || !validateQuestionSet(questions)) {
    questions = await callAi();
  }

  if (looksLikePlaceholder(questions)) {
    throw new ApiError(500, "AI returned invalid placeholder content. Please try again or add the quiz manually.");
  }

  if (!validateQuestionSet(questions)) {
    throw new ApiError(
      500,
      "AI did not return the required 5 easy, 10 medium, and 5 hard questions. Please try again or add the quiz manually."
    );
  }

  return questions;
};

const runQuizGeneration = async (quizId, lectureTitle, transcriptText, isDifferent = false) => {
  let questions;
  try {
    questions = await generateQuestionsWithAi(transcriptText, isDifferent);
  } catch (err) {
    await Quiz.findByIdAndUpdate(quizId, { status: "failed" });
    throw err;
  }

  return Quiz.findByIdAndUpdate(
    quizId,
    {
      title: `Quiz for ${lectureTitle}`,
      questions: questions.map((q) => ({
        questionText:  q.questionText,
        options:       q.options,
        correctAnswer: q.correctAnswer,
        explanation:   q.explanation || "",
        difficulty:    q.difficulty,
      })),
      totalQuestions: questions.length,
      status:         "ready",
      generatedByAi:  true,
    },
    { returnDocument: 'after', runValidators: true }
  );
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const generateQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const { lecture, transcript } = await getOwnedLectureWithTranscript(lectureId, req.user._id);

  // Return existing ready quiz instead of regenerating
  const existingQuiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
  if (existingQuiz) {
    return res.status(200).json(new ApiResponse(200, existingQuiz));
  }

  const course = await Course.findById(lecture.course._id);
  const quota  = await consumeDailyAiQuota(course);

  const quiz = await Quiz.findOneAndUpdate(
    { lecture: lectureId },
    { lecture: lectureId, course: lecture.course._id, status: "generating", questions: [] },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  const finalQuiz = await runQuizGeneration(quiz._id, lecture.title, transcript.transcriptText);

  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

  return res.status(201).json(
    new ApiResponse(201, { quiz: finalQuiz, aiQuota: quota })
  );
});


export const regenerateQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const { lecture, transcript } = await getOwnedLectureWithTranscript(lectureId, req.user._id);

  const course = await Course.findById(lecture.course._id);
  const quota  = await consumeDailyAiQuota(course);

  // Delete any existing quiz so we start fresh
  await Quiz.findOneAndDelete({ lecture: lectureId });

  const quiz = await new Quiz({
    lecture: lectureId,
    course: lecture.course._id,
    status: "generating",
    questions: [],
  }).save({ validateBeforeSave: false });

  const finalQuiz = await runQuizGeneration(quiz._id, lecture.title, transcript.transcriptText, true);

  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

  return res.status(201).json(
    new ApiResponse(201, { quiz: finalQuiz, aiQuota: quota })
  );
});


// NEW: Instructor creates a quiz manually — no AI involved, no daily limit consumed.
// Requires exactly 20 questions: 5 easy, 10 medium, 5 hard.
export const createManualQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { questions, title } = req.body;

  const lecture = await getOwnedLecture(lectureId, req.user._id);

  if (!Array.isArray(questions) || questions.length !== TOTAL_QUESTIONS) {
    throw new ApiError(400, `Quiz must contain exactly ${TOTAL_QUESTIONS} questions`);
  }

  if (!validateQuestionSet(questions)) {
    throw new ApiError(
      400,
      `Quiz must have exactly ${EASY_COUNT} easy, ${MEDIUM_COUNT} medium, and ${HARD_COUNT} hard questions`
    );
  }

  for (const q of questions) {
    if (!q.questionText?.trim()) throw new ApiError(400, "Every question must have text");
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new ApiError(400, "Every question must have exactly 4 options");
    }
    if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
      throw new ApiError(400, "Correct answer must match one of the 4 options");
    }
  }

  const existingQuiz = await Quiz.findOne({ lecture: lectureId });
  if (existingQuiz) await Quiz.findByIdAndDelete(existingQuiz._id);

  const quiz = await Quiz.create({
    lecture: lectureId,
    course: lecture.course._id,
    title: title?.trim() || `Quiz for ${lecture.title}`,
    questions: questions.map((q) => ({
      questionText:  q.questionText.trim(),
      options:       q.options,
      correctAnswer: q.correctAnswer,
      explanation:   q.explanation?.trim() || "",
      difficulty:    q.difficulty,
    })),
    generatedByAi: false,
    status: "ready",
  });

  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

  return res.status(201).json(new ApiResponse(201, quiz, "Quiz created manually"));
});


// NEW: Instructor edits an existing quiz (AI-generated or manual) by
// replacing the full question set. Re-validates the 5/10/5 split.
export const updateManualQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { questions, title } = req.body;

  const lecture = await getOwnedLecture(lectureId, req.user._id);

  const quiz = await Quiz.findOne({ lecture: lectureId });
  if (!quiz) throw new ApiError(404, "Quiz not found for this lecture");

  if (!Array.isArray(questions) || questions.length !== TOTAL_QUESTIONS) {
    throw new ApiError(400, `Quiz must contain exactly ${TOTAL_QUESTIONS} questions`);
  }

  if (!validateQuestionSet(questions)) {
    throw new ApiError(
      400,
      `Quiz must have exactly ${EASY_COUNT} easy, ${MEDIUM_COUNT} medium, and ${HARD_COUNT} hard questions`
    );
  }

  for (const q of questions) {
    if (!q.questionText?.trim()) throw new ApiError(400, "Every question must have text");
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new ApiError(400, "Every question must have exactly 4 options");
    }
    if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
      throw new ApiError(400, "Correct answer must match one of the 4 options");
    }
  }

  quiz.title = title?.trim() || quiz.title;
  quiz.questions = questions.map((q) => ({
    questionText:  q.questionText.trim(),
    options:       q.options,
    correctAnswer: q.correctAnswer,
    explanation:   q.explanation?.trim() || "",
    difficulty:    q.difficulty,
  }));
  quiz.generatedByAi = false; // any manual edit marks the quiz as manually curated
  quiz.status = "ready";

  await quiz.save();

  return res.status(200).json(new ApiResponse(200, quiz, "Quiz updated"));
});


export const getQuizByLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course?.instructor) throw new ApiError(404, "This course is no longer available");

  const isInstructor =
    req.user && course.instructor.toString() === req.user._id.toString();

  if (!isInstructor && !course.isFree) {
    if (!req.user) throw new ApiError(401, "Login required");

    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      isActive: true,
    });

    if (!enrollment) throw new ApiError(403, "Enroll to access quiz");
  }

  const quiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
  if (!quiz) throw new ApiError(404, "Quiz not found");

  let quizData = quiz.toObject();

  if (!isInstructor) {
    quizData.questions = quizData.questions.map(({ _id, questionText, options, difficulty }) => ({
      _id,
      questionText,
      options,
      difficulty,
    }));
  }

  return res.status(200).json(new ApiResponse(200, quizData));
});


export const deleteQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  await getOwnedLecture(lectureId, req.user._id);

  await Quiz.findOneAndDelete({ lecture: lectureId });

  return res.status(200).json(new ApiResponse(200, null, "Quiz deleted"));
});


// NEW: Lets the frontend show "3/5 AI generations used today" without
// triggering an actual generation.
export const getAiQuota = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = course.aiQuizGenerationsDate
    ? new Date(course.aiQuizGenerationsDate)
    : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const isSameDay = lastDate && lastDate.getTime() === today.getTime();
  const used = isSameDay ? course.aiQuizGenerationsToday : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      used,
      limit: DAILY_AI_LIMIT,
      remaining: Math.max(DAILY_AI_LIMIT - used, 0),
    })
  );
});
