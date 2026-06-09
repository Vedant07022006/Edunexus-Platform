import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import errorHandler from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.routes.js";
import courseRouter from "./routes/course.routes.js";
import lectureRouter from "./routes/lecture.routes.js";
import transcriptRouter from "./routes/transcript.routes.js";
import quizRouter from "./routes/quiz.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import quizAttemptRouter from "./routes/quizAttempt.routes.js";
import revenueRouter from "./routes/revenue.routes.js";

import "./models/user.model.js";
import "./models/course.model.js";
import "./models/lecture.model.js";
import "./models/transcript.model.js";
import "./models/quiz.model.js";
import "./models/enrollment.model.js";
import "./models/payment.model.js";
import "./models/quizAttempt.model.js";
import "./models/pendingUser.model.js";

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

app.use(errorHandler);

export default app;