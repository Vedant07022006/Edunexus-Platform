// import asyncHandler from "../utils/asyncHandler.js";
// import ApiError from "../utils/ApiError.js";
// import ApiResponse from "../utils/ApiResponse.js";
// import { QuizAttempt } from "../models/quizAttempt.model.js";
// import { Quiz } from "../models/quiz.model.js";
// import { Enrollment } from "../models/enrollment.model.js";
// import { Lecture } from "../models/lecture.model.js";
// import mongoose from "mongoose";



// export const submitQuiz = asyncHandler(async (req, res) => {
//   const { lectureId } = req.params;
//   const { answers, timeTakenInSeconds } = req.body;

//   if (!answers || !Array.isArray(answers) || answers.length === 0) {
//     throw new ApiError(400, "Answers are required");
//   }

//   const lecture = await Lecture.findById(lectureId).populate("course");
//   if (!lecture) throw new ApiError(404, "Lecture not found");

//   const course = lecture.course;

  
//   if (!course.isFree) {
//     const enrollment = await Enrollment.findOne({
//       user: req.user._id,
//       course: course._id,
//       isActive: true,
//     });

//     if (!enrollment) {
//       throw new ApiError(403, "Please enroll in this course to attempt the quiz");
//     }
//   }

//   const quiz = await Quiz.findOne({ lecture: lectureId, status: "ready" });
//   if (!quiz) throw new ApiError(404, "Quiz not found for this lecture");

//   const previousAttempts = await QuizAttempt.countDocuments({
//     user: req.user._id,
//     quiz: quiz._id,
//   });


//   const evaluatedAnswers = answers.map((answer) => {
//     const question = quiz.questions.find(
//       (q) => q._id.toString() === answer.questionId.toString()
//     );

//     if (!question) {
//       return {
//         question: answer.questionId,
//         selectedAnswer: answer.selectedAnswer,
//         isCorrect: false,
//       };
//     }

//     return {
//       question: answer.questionId,
//       selectedAnswer: answer.selectedAnswer,
//       isCorrect: question.correctAnswer === answer.selectedAnswer,
//     };
//   });

//   const totalCorrect = evaluatedAnswers.filter((a) => a.isCorrect).length;
//   const totalQuestions = evaluatedAnswers.length;
//   const score = Math.round((totalCorrect / totalQuestions) * 100);
//   const isPassed = score >= quiz.passingScore;

//   await QuizAttempt.create({
//     user: req.user._id,
//     quiz: quiz._id,
//     lecture: lectureId,
//     course: course._id,
//     answers: evaluatedAnswers,
//     score,
//     totalCorrect,
//     totalQuestions,
//     isPassed,
//     attemptNumber: previousAttempts + 1,
//     timeTakenInSeconds: timeTakenInSeconds || 0,
//   });

//   return res.status(201).json(
//     new ApiResponse(
//       201,
//       {
//         score,
//         totalCorrect,
//         totalQuestions,
//         isPassed,
//         passingScore: quiz.passingScore,
//         attemptNumber: previousAttempts + 1,
//         answers: evaluatedAnswers,
//       },
//       isPassed
//         ? "Congratulations! You passed the quiz!"
//         : "Quiz submitted. Better luck next time!"
//     )
//   );
// });



// export const getMyAttempts = asyncHandler(async (req, res) => {
//   const { lectureId } = req.params;

//   const quiz = await Quiz.findOne({ lecture: lectureId });
//   if (!quiz) throw new ApiError(404, "Quiz not found");

//   const attempts = await QuizAttempt.find({
//     user: req.user._id,
//     quiz: quiz._id,
//   })
//     .select("-answers -__v")
//     .sort({ createdAt: -1 });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         attempts,
//         total: attempts.length,
//         bestScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0,
//       },
//       "Attempts fetched successfully"
//     )
//   );
// });


// // GET BEST SCORE — Student only

// export const getBestScore = asyncHandler(async (req, res) => {
//   const { lectureId } = req.params;

//   const quiz = await Quiz.findOne({ lecture: lectureId });
//   if (!quiz) throw new ApiError(404, "Quiz not found");

//   const bestAttempt = await QuizAttempt.findOne({
//     user: req.user._id,
//     quiz: quiz._id,
//   })
//     .sort({ score: -1 })
//     .select("-answers -__v");

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         bestScore: bestAttempt ? bestAttempt.score : 0,
//         attempt: bestAttempt || null,
//       },
//       "Best score fetched successfully"
//     )
//   );
// });



// export const getLeaderboard = asyncHandler(async (req, res) => {
//   const { courseId } = req.params;

//   const leaderboard = await QuizAttempt.aggregate([
//     { $match: { course: new mongoose.Types.ObjectId(courseId) } },
//     {
//       $group: {
//         _id: "$user",
//         bestScore: { $max: "$score" },
//         totalAttempts: { $sum: 1 },
//         totalCorrect: { $max: "$totalCorrect" },
//         lastAttempt: { $max: "$createdAt" },
//       },
//     },
//     { $sort: { bestScore: -1 } },
//     { $limit: 10 },
//     {
//       $lookup: {
//         from: "users",
//         localField: "_id",
//         foreignField: "_id",
//         as: "user",
//       },
//     },
//     { $unwind: "$user" },
//     {
//       $project: {
//         _id: 0,
//         userId: "$_id",
//         fullName: "$user.fullName",
//         bestScore: 1,
//         totalAttempts: 1,
//         totalCorrect: 1,
//         lastAttempt: 1,
//       },
//     },
//   ]);

//   const rankedLeaderboard = leaderboard.map((entry, index) => ({
//     rank: index + 1,
//     ...entry,
//   }));

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { leaderboard: rankedLeaderboard, total: rankedLeaderboard.length },
//       "Leaderboard fetched successfully"
//     )
//   );
// });


// // GET ATTEMPT DETAILS — Student only (own attempt)
// // Returns full answer breakdown with correct answers revealed.

// export const getAttemptDetails = asyncHandler(async (req, res) => {
//   const { attemptId } = req.params;

//   const attempt = await QuizAttempt.findById(attemptId)
//     .populate("quiz", "questions passingScore title")
//     .select("-__v");

//   if (!attempt) throw new ApiError(404, "Attempt not found");

//   if (attempt.user.toString() !== req.user._id.toString()) {
//     throw new ApiError(403, "You are not authorized to view this attempt");
//   }

//   const detailedAnswers = attempt.answers.map((answer) => {
//     const question = attempt.quiz.questions.find(
//       (q) => q._id.toString() === answer.question.toString()
//     );

//     return {
//       question: question ? question.questionText : "Question not found",
//       selectedAnswer: answer.selectedAnswer,
//       correctAnswer: question ? question.correctAnswer : null,
//       explanation: question ? question.explanation : null,
//       isCorrect: answer.isCorrect,
//     };
//   });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       { ...attempt.toObject(), detailedAnswers },
//       "Attempt details fetched successfully"
//     )
//   );
// });








import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Quiz } from "../models/quiz.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Lecture } from "../models/lecture.model.js";
import mongoose from "mongoose";


// ================= SUBMIT QUIZ =================
export const submitQuiz = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Login required");
  }

  const { lectureId } = req.params;
  const { answers, timeTakenInSeconds } = req.body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw new ApiError(400, "Answers are required");
  }

  const lecture = await Lecture.findById(lectureId).populate("course");
  if (!lecture) throw new ApiError(404, "Lecture not found");

  const course = lecture.course;

  // ✅ allow free lecture even in paid course
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

  // ✅ validate answers
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
  const totalQuestions = evaluatedAnswers.length;
  const score = Math.round((totalCorrect / totalQuestions) * 100);
  const isPassed = score >= quiz.passingScore;

  const previousAttempts = await QuizAttempt.countDocuments({
    user: req.user._id,
    quiz: quiz._id,
  });

  await QuizAttempt.create({
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
  });

  return res.status(201).json(
    new ApiResponse(201, {
      score,
      totalCorrect,
      totalQuestions,
      isPassed,
      passingScore: quiz.passingScore,
      attemptNumber: previousAttempts + 1,
      answers: evaluatedAnswers,
    })
  );
});


// ================= GET MY ATTEMPTS =================
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


// ================= GET BEST SCORE =================
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


// ================= GET LEADERBOARD =================
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


// ================= GET ATTEMPT DETAILS =================
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

  const detailedAnswers = attempt.answers.map((answer) => {
    const question = attempt.quiz.questions.find(
      (q) => q._id.toString() === answer.question.toString()
    );

    return {
      question: question ? question.questionText : "Not found",
      selectedAnswer: answer.selectedAnswer,
      correctAnswer: question ? question.correctAnswer : null,
      explanation: question ? question.explanation : null,
      isCorrect: answer.isCorrect,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, {
      ...attempt.toObject(),
      detailedAnswers,
    })
  );
});

