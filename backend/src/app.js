import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import errorHandler from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.routes.js";
import courseRouter from "./routes/course.routes.js";
import lectureRouter from "./routes/lecture.routes.js";
import transcriptRouter from "./routes/transcript.routes.js";
import quizRouter from "./routes/quiz.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import quizAttemptRouter from "./routes/quizAttempt.routes.js";



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


app.use(helmet());


const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Routes

app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/lectures", lectureRouter);
app.use("/api/v1/transcripts", transcriptRouter);
app.use("/api/v1/quizzes", quizRouter);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/quiz-attempts", quizAttemptRouter);


app.use(errorHandler);

export default app;
