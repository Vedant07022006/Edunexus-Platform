// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { Quiz } from "../models/quiz.model.js";
// import { Transcript } from "../models/transcript.model.js";
// import { Lecture } from "../models/lecture.model.js";
// import { Enrollment } from "../models/enrollment.model.js";
// import Groq from "groq-sdk";

// const getGroqClient = () =>
//   new Groq({ apiKey: process.env.GROQ_API_KEY });

// const parseQuizResponse = (text) => {
//   try {
//     const cleaned = text
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();
//     return JSON.parse(cleaned);
//   } catch (error) {
//     throw new ApiError(500, "Failed to parse quiz response from AI");
//   }
// };

// const trimTranscript = (text, maxChars = 3000) => {
//   if (text.length <= maxChars) return text;
//   return text.slice(0, maxChars) + "...";
// };

// const buildPrompt = (
//   transcriptText,
//   totalQuestions,
//   isDifferent = false
// ) => `
// You are an expert quiz generator. Based on the following lecture transcript, generate exactly ${totalQuestions} multiple choice questions.

// Transcript:
// "${transcriptText}"

// Requirements:
// - Each question must have exactly 4 options
// - Only one option should be correct
// - Questions should test understanding of key concepts
// - Difficulty should be moderate
// - Include a brief explanation for the correct answer
// ${isDifferent ? "- Make questions different from any previous quiz on this topic\n" : ""}
// Return ONLY a valid JSON array in this exact format:
// [
//   {
//     "questionText": "Question here?",
//     "options": ["Option A", "Option B", "Option C", "Option D"],
//     "correctAnswer": "Option A",
//     "explanation": "Explanation"
//   }
// ]`;


// export const generateQuiz = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { lectureId } = req.params;
//   const { totalQuestions = 5 } = req.body;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");
//   if (!lecture.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (lecture.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized");
//   }

//   const transcript = await Transcript.findOne({
//     lecture: lectureId,
//     status: "completed",
//   });
//   if (!transcript) throw new ApiError(404, "Transcript not found");

//   const existingQuiz = await Quiz.findOne({ lecture: lectureId });
//   if (existingQuiz && existingQuiz.status === "ready") {
//     return res
//       .status(200)
//       .json(new ApiResponse(200, existingQuiz));
//   }

//   let quiz = await Quiz.findOneAndUpdate(
//     { lecture: lectureId },
//     {
//       lecture: lectureId,
//       course: lecture.course._id,
//       status: "generating",
//       questions: [],
//     },
//     { upsert: true, new: true }
//   );

//   const trimmedTranscript = trimTranscript(
//     transcript.transcriptText,
//     3000
//   );

//   const groq = getGroqClient();

//   const completion = await groq.chat.completions.create({
//     messages: [
//       { role: "user", content: buildPrompt(trimmedTranscript, totalQuestions) },
//     ],
//     model: "llama-3.3-70b-versatile",
//     temperature: 0.7,
//     max_tokens: 2000,
//   });

//   const text = completion.choices[0]?.message?.content || "";
//   const questions = parseQuizResponse(text);

//   if (!Array.isArray(questions) || questions.length === 0) {
//     await Quiz.findByIdAndUpdate(quiz._id, { status: "failed" });
//     throw new ApiError(500, "Invalid AI response");
//   }

//   quiz = await Quiz.findByIdAndUpdate(
//     quiz._id,
//     {
//       title: `Quiz for ${lecture.title}`,
//       questions: questions.map((q) => ({
//         questionText: q.questionText,
//         options: q.options,
//         correctAnswer: q.correctAnswer,
//         explanation: q.explanation || "",
//       })),
//       totalQuestions: questions.length,
//       status: "ready",
//       generatedByAi: true,
//     },
//     { new: true }
//   );

//   // Mark lecture pipeline as fully complete
//   await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

//   return res.status(201).json(new ApiResponse(201, quiz));
// });


// export const getQuizByLecture = asyncHandler(async (req, res) => {
//   const { lectureId } = req.params;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");

//   const course = lecture.course;

//   if (!course.instructor) {
//     throw new ApiError(404, "This course is no longer available");
//   }

//   const isInstructor =
//     req.user &&
//     course.instructor.toString() === req.user._id.toString();

//   if (!isInstructor) {
//     if (!course.isFree) {
//       if (!req.user) {
//         throw new ApiError(401, "Login required");
//       }

//       const enrollment = await Enrollment.findOne({
//         user: req.user._id,
//         course: course._id,
//         isActive: true,
//       });

//       if (!enrollment) {
//         throw new ApiError(403, "Enroll to access quiz");
//       }
//     }
//   }

//   const quiz = await Quiz.findOne({
//     lecture: lectureId,
//     status: "ready",
//   });

//   if (!quiz) throw new ApiError(404, "Quiz not found");

//   let quizData = quiz.toObject();

//   if (!isInstructor) {
//     quizData.questions = quizData.questions.map((q) => ({
//       _id: q._id,
//       questionText: q.questionText,
//       options: q.options,
//     }));
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, quizData));
// });


// export const regenerateQuiz = asyncHandler(async (req, res) => {
//   if (req.user.role !== "instructor") {
//     throw new ApiError(403, "Only instructors allowed");
//   }

//   const { lectureId } = req.params;
//   const { totalQuestions = 5 } = req.body;

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");
//   if (!lecture.course.instructor) throw new ApiError(404, "This course is no longer available");

//   if (lecture.course.instructor.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "Not authorized");
//   }

//   await Quiz.findOneAndDelete({ lecture: lectureId });

//   const transcript = await Transcript.findOne({
//     lecture: lectureId,
//     status: "completed",
//   });
//   if (!transcript) throw new ApiError(404, "Transcript not found");

//   let quiz = new Quiz({
//     lecture: lectureId,
//     course: lecture.course._id,
//     status: "generating",
//     questions: [],
//   });

//   await quiz.save({ validateBeforeSave: false });

//   const trimmedTranscript = trimTranscript(
//     transcript.transcriptText,
//     3000
//   );

//   const groq = getGroqClient();

//   const completion = await groq.chat.completions.create({
//     messages: [
//       {
//         role: "user",
//         content: buildPrompt(trimmedTranscript, totalQuestions, true),
//       },
//     ],
//     model: "llama-3.3-70b-versatile",
//     temperature: 0.7,
//     max_tokens: 2000,
//   });

//   const text = completion.choices[0]?.message?.content || "";
//   const questions = parseQuizResponse(text);

//   if (!Array.isArray(questions) || questions.length === 0) {
//     await Quiz.findByIdAndUpdate(quiz._id, { status: "failed" });
//     throw new ApiError(500, "Invalid AI response");
//   }

//   quiz = await Quiz.findByIdAndUpdate(
//     quiz._id,
//     {
//       title: `Quiz for ${lecture.title}`,
//       questions: questions.map((q) => ({
//         questionText: q.questionText,
//         options: q.options,
//         correctAnswer: q.correctAnswer,
//         explanation: q.explanation || "",
//       })),
//       totalQuestions: questions.length,
//       status: "ready",
//       generatedByAi: true,
//     },
//     { new: true }
//   );

//   // Mark lecture pipeline as fully complete
//   await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

//   return res.status(201).json(new ApiResponse(201, quiz));
// });


// export const deleteQuiz = asyncHandler(async (req, res) => {
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

//   await Quiz.findOneAndDelete({ lecture: lectureId });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Quiz deleted"));
// });





import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Quiz } from "../models/quiz.model.js";
import { Transcript } from "../models/transcript.model.js";
import { Lecture } from "../models/lecture.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import Groq from "groq-sdk";

// ─── Groq helpers ──────────────────────────────────────────────────────────────

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const trimTranscript = (text, maxChars = 3000) =>
  text.length <= maxChars ? text : text.slice(0, maxChars) + "...";

const buildPrompt = (transcriptText, totalQuestions, isDifferent = false) => `
You are an expert quiz generator. Based on the following lecture transcript, generate exactly ${totalQuestions} multiple choice questions.

Transcript:
"${transcriptText}"

Requirements:
- Each question must have exactly 4 options
- Only one option should be correct
- Questions should test understanding of key concepts
- Difficulty should be moderate
- Include a brief explanation for the correct answer
${isDifferent ? "- Make questions different from any previous quiz on this topic\n" : ""}
Return ONLY a valid JSON array in this exact format:
[
  {
    "questionText": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Explanation"
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

// ─── Shared helper ─────────────────────────────────────────────────────────────

/**
 * Finds a lecture owned by the instructor and returns both the lecture
 * and a completed transcript. Throws on any failure.
 */
const getOwnedLectureWithTranscript = async (lectureId, instructorId) => {
  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");
  if (!lecture.course?.instructor) throw new ApiError(404, "This course is no longer available");
  if (lecture.course.instructor.toString() !== instructorId.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const transcript = await Transcript.findOne({ lecture: lectureId, status: "completed" });
  if (!transcript) throw new ApiError(404, "Completed transcript not found. Generate a transcript first.");

  return { lecture, transcript };
};

/**
 * Calls Groq to generate quiz questions and saves them on the given quiz doc.
 * Returns the updated quiz.
 */
const runQuizGeneration = async (quizId, lectureTitle, transcriptText, totalQuestions, isDifferent = false) => {
  const trimmed = trimTranscript(transcriptText, 3000);
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: buildPrompt(trimmed, totalQuestions, isDifferent) }],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 2000,
  });

  const text = completion.choices[0]?.message?.content || "";
  const questions = parseQuizResponse(text);

  if (!Array.isArray(questions) || questions.length === 0) {
    await Quiz.findByIdAndUpdate(quizId, { status: "failed" });
    throw new ApiError(500, "Invalid AI response — no questions returned");
  }

  return Quiz.findByIdAndUpdate(
    quizId,
    {
      title: `Quiz for ${lectureTitle}`,
      questions: questions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      })),
      totalQuestions: questions.length,
      status: "ready",
      generatedByAi: true,
    },
    { new: true }
  );
};

// ─── Controllers ───────────────────────────────────────────────────────────────

export const generateQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { totalQuestions = 5 } = req.body;

  const { lecture, transcript } = await getOwnedLectureWithTranscript(lectureId, req.user._id);

  // Return existing ready quiz instead of regenerating
  const existingQuiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
  if (existingQuiz) {
    return res.status(200).json(new ApiResponse(200, existingQuiz));
  }

  // Upsert a "generating" placeholder
  const quiz = await Quiz.findOneAndUpdate(
    { lecture: lectureId },
    { lecture: lectureId, course: lecture.course._id, status: "generating", questions: [] },
    { upsert: true, new: true }
  );

  const finalQuiz = await runQuizGeneration(
    quiz._id,
    lecture.title,
    transcript.transcriptText,
    totalQuestions
  );

  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

  return res.status(201).json(new ApiResponse(201, finalQuiz));
});


export const regenerateQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { totalQuestions = 5 } = req.body;

  const { lecture, transcript } = await getOwnedLectureWithTranscript(lectureId, req.user._id);

  // Delete any existing quiz so we start fresh
  await Quiz.findOneAndDelete({ lecture: lectureId });

  const quiz = await new Quiz({
    lecture: lectureId,
    course: lecture.course._id,
    status: "generating",
    questions: [],
  }).save({ validateBeforeSave: false });

  const finalQuiz = await runQuizGeneration(
    quiz._id,
    lecture.title,
    transcript.transcriptText,
    totalQuestions,
    true // isDifferent — prompts AI to vary the questions
  );

  await Lecture.findByIdAndUpdate(lectureId, { processingStatus: "completed" });

  return res.status(201).json(new ApiResponse(201, finalQuiz));
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

  // Strip correct answers and explanations from student view
  if (!isInstructor) {
    quizData.questions = quizData.questions.map(({ _id, questionText, options }) => ({
      _id,
      questionText,
      options,
    }));
  }

  return res.status(200).json(new ApiResponse(200, quizData));
});


export const deleteQuiz = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");
  if (!lecture.course?.instructor) throw new ApiError(404, "This course is no longer available");

  if (lecture.course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  await Quiz.findOneAndDelete({ lecture: lectureId });

  return res.status(200).json(new ApiResponse(200, null, "Quiz deleted"));
});