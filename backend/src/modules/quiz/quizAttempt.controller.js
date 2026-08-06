import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { QuizAttempt } from "./quizAttempt.model.js";
import { Quiz } from "./quiz.model.js";
import { Enrollment } from "../enrollment/enrollment.model.js";
import { Lecture } from "../lecture/lecture.model.js";
import mongoose from "mongoose";
import { getGroqClient, parseAiJsonResponse } from "../../utils/groq.js";

const MAX_ATTEMPTS   = 3;
const COOLDOWN_HOURS = 24;

// ─── Weak-spot review helpers ──────────────────────────────────────────────────

const parseWeakSpotResponse = (raw) => {
  return parseAiJsonResponse(
    raw,
    (parsed) => {
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new ApiError(500, "AI did not return valid feedback. Please try again.");
      }
    },
    "AI returned invalid feedback content. Please try again."
  )
    .map((point) => (typeof point === "string" ? point.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
};

const buildWeakSpotPrompt = (wrongQuestions) => {
  const questionsBlock = wrongQuestions
    .map(
      (q, i) =>
        `${i + 1}. Question: ${q.questionText}\n   Correct answer: ${q.correctAnswer}\n   Student answered: ${q.selectedAnswer}\n   Explanation: ${q.explanation || "N/A"}`
    )
    .join("\n\n");

  return `
A student just took a quiz and got the following questions wrong. Based on the
pattern of mistakes, write 2 to 4 short, encouraging, specific study
suggestions telling them which topics/concepts to review.

Rules:
- Return ONLY a JSON array of strings, nothing else — no markdown, no preamble.
- Each string should be one concise, actionable suggestion (max ~25 words).
- Be encouraging in tone, not discouraging — this is meant to help them improve.
- Focus on the underlying CONCEPT they seem to be missing, not just repeating the question.
- Example valid output: ["Review how binary search handles edge cases with duplicate values.", "Revisit the difference between synchronous and asynchronous JavaScript."]

Questions the student got wrong:
${questionsBlock}
`.trim();
};

const generateWeakSpotWithAi = async (wrongQuestions) => {
  const groq = getGroqClient();

  const callAi = async () => {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: buildWeakSpotPrompt(wrongQuestions) }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 500,
    });
    const text = completion.choices[0]?.message?.content || "";
    return parseWeakSpotResponse(text);
  };

  try {
    return await callAi();
  } catch {
    return await callAi(); // one retry, matching the other AI-generation patterns
  }
};


// Checks whether a student is currently allowed to start a new quiz
// attempt: enrolled -> video completed -> quiz exists -> under attempt
// limit -> not in cooldown. Used by LecturePlayer to lock/unlock the quiz.
export const checkEligibility = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;
  if (!course) throw new ApiError(404, "Course not found");

  if (!course.isFree && !lecture.isFree) {
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      isActive: true,
    });

    if (!enrollment) {
      return res.status(200).json(
        new ApiResponse(200, {
          eligible: false,
          reason: "not_enrolled",
          message: "Please enroll in this course to attempt the quiz",
        })
      );
    }

    const isVideoCompleted = enrollment.completedLectures?.some(
      (id) => id.toString() === lectureId.toString()
    );

    if (!isVideoCompleted) {
      return res.status(200).json(
        new ApiResponse(200, {
          eligible: false,
          reason: "video_not_completed",
          message: "Watch the full video before attempting the quiz",
        })
      );
    }
  }

  const quiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
  if (!quiz) {
    return res.status(200).json(
      new ApiResponse(200, {
        eligible: false,
        reason: "no_quiz",
        message: "No quiz available for this lecture",
      })
    );
  }

  const attempts = await QuizAttempt.find({
    user: req.user._id,
    quiz: quiz._id,
  }).sort({ createdAt: -1 });

  const attemptCount = attempts.length;

  if (attemptCount >= MAX_ATTEMPTS) {
    return res.status(200).json(
      new ApiResponse(200, {
        eligible: false,
        reason: "max_attempts_reached",
        message: `You have used all ${MAX_ATTEMPTS} attempts`,
        attemptCount,
        maxAttempts: MAX_ATTEMPTS,
        attemptsLeft: 0,
      })
    );
  }

  if (attemptCount > 0) {
    const lastAttempt = attempts[0];
    const hoursSinceLast =
      (Date.now() - new Date(lastAttempt.createdAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLast < COOLDOWN_HOURS) {
      const hoursLeft = Math.floor(COOLDOWN_HOURS - hoursSinceLast);
      const minutesLeft = Math.ceil(((COOLDOWN_HOURS - hoursSinceLast) % 1) * 60);

      return res.status(200).json(
        new ApiResponse(200, {
          eligible: false,
          reason: "cooldown_active",
          message: `Next attempt available in ${hoursLeft}h ${minutesLeft}m`,
          hoursLeft,
          minutesLeft,
          attemptCount,
          maxAttempts: MAX_ATTEMPTS,
          attemptsLeft: MAX_ATTEMPTS - attemptCount,
        })
      );
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {
      eligible: true,
      reason: null,
      message: "You are eligible to attempt the quiz",
      attemptCount,
      maxAttempts: MAX_ATTEMPTS,
      attemptsLeft: MAX_ATTEMPTS - attemptCount,
    })
  );
});



export const submitQuiz = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Login required");
  }

  const { lectureId } = req.params;
  const {
    answers,
    timeTakenInSeconds,
    isAutoSubmitted,
    autoSubmitReason,
    tabSwitchCount,
    flaggedQuestions,
  } = req.body;

  // NOTE: an auto-submit (timer expiry or tab-switch limit) may legitimately
  // have zero or partial answers, so we no longer reject an empty array —
  // only reject if answers is missing or not an array at all.
  if (!answers || !Array.isArray(answers)) {
    throw new ApiError(400, "Answers must be provided as an array");
  }

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;

 
  if (!course.isFree && !lecture.isFree) {
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      isActive: true,
    });

    if (!enrollment) {
      throw new ApiError(403, "Please enroll to attempt quiz");
    }
  }

  const quiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
  if (!quiz) throw new ApiError(404, "Quiz not found");

  
  const previousAttempts = await QuizAttempt.countDocuments({
    user: req.user._id,
    quiz: quiz._id,
  });

  if (previousAttempts >= MAX_ATTEMPTS) {
    throw new ApiError(400, `Maximum ${MAX_ATTEMPTS} attempts reached`);
  }

  const validQuestionIds = quiz.questions.map((q) => q._id.toString());

  const evaluatedAnswers = answers.map((answer) => {
    if (!validQuestionIds.includes(answer.questionId.toString())) {
      return {
        question: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: false,
      };
    }

    const question = quiz.questions.find(
      (q) => q._id.toString() === answer.questionId.toString()
    );

    return {
      question: answer.questionId,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: question.correctAnswer === answer.selectedAnswer,
    };
  });

  const totalCorrect = evaluatedAnswers.filter((a) => a.isCorrect).length;
  // Use the quiz's actual question count as the denominator, not just the
  // number of answers submitted — an auto-submitted attempt may have fewer
  // answers than questions, and those unanswered ones should count as wrong,
  // not be excluded from the percentage calculation.
  const totalQuestions = quiz.questions.length;
  const score = Math.round((totalCorrect / totalQuestions) * 100);
  const isPassed = score >= quiz.passingScore;

  const validAutoSubmitReasons = ["timer_expired", "tab_switch_limit", "fullscreen_exit"];
  const safeAutoSubmitReason = validAutoSubmitReasons.includes(autoSubmitReason)
    ? autoSubmitReason
    : null;

  const createdAttempt = await QuizAttempt.create({
    user: req.user._id,
    quiz: quiz._id,
    lecture: lectureId,
    course: course._id,
    answers: evaluatedAnswers,
    score,
    totalCorrect,
    totalQuestions,
    isPassed,
    attemptNumber: previousAttempts + 1,
    timeTakenInSeconds: timeTakenInSeconds || 0,
    isAutoSubmitted: !!isAutoSubmitted,
    autoSubmitReason: isAutoSubmitted ? safeAutoSubmitReason : null,
    tabSwitchCount: Number(tabSwitchCount) || 0,
    flaggedQuestions: Array.isArray(flaggedQuestions) ? flaggedQuestions : [],
  });

  return res.status(201).json(
    new ApiResponse(201, {
      attemptId: createdAttempt._id,
      score,
      totalCorrect,
      totalQuestions,
      isPassed,
      passingScore: quiz.passingScore,
      attemptNumber: previousAttempts + 1,
      answers: evaluatedAnswers,
      isAutoSubmitted: !!isAutoSubmitted,
    })
  );
});



export const getMyAttempts = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;

  const quiz = await Quiz.findOne({ lecture: lectureId });
  if (!quiz) throw new ApiError(404, "Quiz not found");

  const attempts = await QuizAttempt.find({
    user: req.user._id,
    quiz: quiz._id,
  })
    .select("-answers -__v")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      attempts,
      total: attempts.length,
      bestScore:
        attempts.length > 0
          ? Math.max(...attempts.map((a) => a.score))
          : 0,
    })
  );
});



export const getBestScore = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { lectureId } = req.params;

  const quiz = await Quiz.findOne({ lecture: lectureId });
  if (!quiz) throw new ApiError(404, "Quiz not found");

  const bestAttempt = await QuizAttempt.findOne({
    user: req.user._id,
    quiz: quiz._id,
  })
    .sort({ score: -1 })
    .select("-answers -__v");

  return res.status(200).json(
    new ApiResponse(200, {
      bestScore: bestAttempt ? bestAttempt.score : 0,
      attempt: bestAttempt || null,
    })
  );
});


export const getLeaderboard = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const leaderboard = await QuizAttempt.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$user",
        bestScore: { $max: "$score" },
        totalAttempts: { $sum: 1 },
        totalCorrect: { $max: "$totalCorrect" },
        lastAttempt: { $max: "$createdAt" },
      },
    },
    { $sort: { bestScore: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        fullName: "$user.fullName",
        bestScore: 1,
        totalAttempts: 1,
        totalCorrect: 1,
        lastAttempt: 1,
      },
    },
  ]);

  const rankedLeaderboard = leaderboard.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  return res.status(200).json(
    new ApiResponse(200, {
      leaderboard: rankedLeaderboard,
      total: rankedLeaderboard.length,
    })
  );
});



export const getAttemptDetails = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { attemptId } = req.params;

  const attempt = await QuizAttempt.findById(attemptId)
    .populate("quiz", "questions passingScore title")
    .select("-__v");

  if (!attempt) throw new ApiError(404, "Attempt not found");

  if (attempt.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  // Build the full breakdown in question order, including questions the
  // student left unanswered (e.g. from an auto-submit) — these still need
  // to show the correct answer and explanation, just with no selected answer.
  const detailedAnswers = attempt.quiz.questions.map((question) => {
    const answer = attempt.answers.find(
      (a) => a.question.toString() === question._id.toString()
    );

    return {
      questionId: question._id,
      question: question.questionText,
      difficulty: question.difficulty,
      options: question.options,
      selectedAnswer: answer ? answer.selectedAnswer : null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || null,
      isCorrect: answer ? answer.isCorrect : false,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, {
      ...attempt.toObject(),
      detailedAnswers,
      maxAttempts: MAX_ATTEMPTS,
    })
  );
});


// On-demand, student-triggered personalized weak-spot
// feedback. Generated once per attempt and cached on the QuizAttempt doc.
export const generateWeakSpotReview = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Login required");

  const { attemptId } = req.params;

  const attempt = await QuizAttempt.findById(attemptId).populate(
    "quiz",
    "questions"
  );
  if (!attempt) throw new ApiError(404, "Attempt not found");

  if (attempt.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (attempt.totalCorrect >= attempt.totalQuestions) {
    throw new ApiError(400, "Perfect score — no weak spots to review!");
  }

  // Return existing review instead of regenerating
  if (attempt.weakSpotStatus === "completed" && attempt.weakSpotReview.length > 0) {
    return res.status(200).json(new ApiResponse(200, attempt, "Review already exists"));
  }

  const wrongQuestions = attempt.answers
    .filter((a) => !a.isCorrect)
    .map((a) => {
      const question = attempt.quiz.questions.find(
        (q) => q._id.toString() === a.question.toString()
      );
      if (!question) return null;
      return {
        questionText:  question.questionText,
        correctAnswer: question.correctAnswer,
        selectedAnswer: a.selectedAnswer || "(no answer)",
        explanation:   question.explanation,
      };
    })
    .filter(Boolean);

  if (wrongQuestions.length === 0) {
    throw new ApiError(400, "No wrong answers found for this attempt");
  }

  await QuizAttempt.findByIdAndUpdate(attemptId, { weakSpotStatus: "generating" });

  let weakSpotReview;
  try {
    weakSpotReview = await generateWeakSpotWithAi(wrongQuestions);
  } catch (err) {
    await QuizAttempt.findByIdAndUpdate(attemptId, { weakSpotStatus: "failed" });
    throw err;
  }

  const updated = await QuizAttempt.findByIdAndUpdate(
    attemptId,
    { weakSpotReview, weakSpotStatus: "completed" },
    { returnDocument: 'after' }
  );

  return res.status(201).json(new ApiResponse(201, updated, "Weak-spot review generated"));
});
