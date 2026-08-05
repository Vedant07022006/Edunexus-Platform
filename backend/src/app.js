import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import errorHandler from "./middlewares/error.middleware.js";
import userRouter from "./modules/user/user.routes.js";
import courseRouter from "./modules/course/course.routes.js";
import lectureRouter from "./modules/lecture/lecture.routes.js";
import transcriptRouter from "./modules/transcript/transcript.routes.js";
import quizRouter from "./modules/quiz/quiz.routes.js";
import enrollmentRouter from "./modules/enrollment/enrollment.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import quizAttemptRouter from "./modules/quiz/quizAttempt.routes.js";
import revenueRouter from "./modules/revenue/revenue.routes.js";
import chatbotRouter from "./modules/chatbot/chatbot.routes.js";
import reviewRouter from "./modules/review/review.routes.js";
import discussionRouter from "./modules/discussion/discussion.routes.js";
import couponRouter from "./modules/coupon/coupon.routes.js";
import bundleRouter from "./modules/bundle/bundle.routes.js";
import reportRouter from "./modules/report/report.routes.js";

import "./modules/user/user.model.js";
import "./modules/course/course.model.js";
import "./modules/lecture/lecture.model.js";
import "./modules/transcript/transcript.model.js";
import "./modules/quiz/quiz.model.js";
import "./modules/enrollment/enrollment.model.js";
import "./modules/payment/payment.model.js";
import "./modules/quiz/quizAttempt.model.js";
import "./modules/user/pendingUser.model.js";
import "./modules/review/review.model.js";
import "./modules/discussion/discussion.model.js";
import "./modules/coupon/coupon.model.js";
import "./modules/bundle/bundle.model.js";
import "./modules/report/report.model.js";

const app = express();

const helmetMiddleware = helmet();
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/users/reset-password-page")) return next();
  return helmetMiddleware(req, res, next);
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: "Too many requests from this IP. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGIN || "*";
      if (allowed === "*") return callback(null, origin || "*");
      const allowedList = allowed.split(",").map((o) => o.trim());
      if (!origin || allowedList.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// Razorpay Webhook — raw body MUST come before express.json()
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    try { req.body = JSON.parse(req.rawBody.toString()); }
    catch { req.body = {}; }
    next();
  }
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// Routes
app.use("/api/v1/users",        userRouter);
app.use("/api/v1/courses",      courseRouter);
app.use("/api/v1/lectures",     lectureRouter);
app.use("/api/v1/transcripts",  transcriptRouter);
app.use("/api/v1/quizzes",      quizRouter);
app.use("/api/v1/enrollments",  enrollmentRouter);
app.use("/api/v1/payments",     paymentRouter);
app.use("/api/v1/quiz-attempts", quizAttemptRouter);
app.use("/api/v1/revenue",      revenueRouter);  // NEW
app.use("/api/v1/chatbot",      chatbotRouter);  // NEW
app.use("/api/v1/reviews",      reviewRouter);   // NEW — Phase 1
app.use("/api/v1/discussions",  discussionRouter); // NEW — Phase 3
app.use("/api/v1/coupons",      couponRouter);      // NEW — Phase 4
app.use("/api/v1/bundles",      bundleRouter);       // NEW — Phase 4
app.use("/api/v1/reports",      reportRouter);       // NEW — Phase 5

app.use(errorHandler);

export default app;