# EduNexus — Full-Stack E-Learning Platform

EduNexus is a modern, production-grade e-learning platform designed to bridge video learning, automated AI assistance, and seamless monetization for instructors and students. It features adaptive HLS video streaming, automated audio transcription powered by AssemblyAI, AI-generated multiple-choice quizzes and RAG doubt-clearing chatbot powered by Groq (Llama 3.3 70B), Razorpay payment processing with automated webhooks, course bundles, discount coupons, interactive discussion forums, completion certificates, and comprehensive revenue analytics for content creators.

---

## Table of Contents

1. [Key Features](#1-key-features)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Environment Variables](#6-environment-variables)
7. [Installation & Setup](#7-installation--setup)
8. [API Endpoint Overview](#8-api-endpoint-overview)
9. [Testing Setup](#9-testing-setup)
10. [Security Notes](#10-security-notes)
11. [Deployment Notes](#11-deployment-notes)
12. [Contributing](#12-contributing)
13. [License](#13-license)
14. [Author](#14-author)

---

## 1. Key Features

### 🎓 Student Experience
- **Course Discovery & Filtering**: Browse published courses by category, skill level, and price; search by keywords.
- **Interactive Video Player**: Stream lecture videos with adaptive HLS/MP4 playback via `react-player` and `hls.js`, complete with synchronized interactive transcript panels and timestamp seek functionality.
- **AI Doubt Assistant**: Interactive RAG chatbot (`Groq Llama-3.3-70b-versatile`) contextualized to the specific lecture transcript to answer student doubts instantly (50 daily messages quota).
- **Interactive Quizzes**: Take AI-generated or manually curated 20-question multiple-choice quizzes (5 Easy, 10 Medium, 5 Hard) with instant grading, score history, and detailed answer explanations.
- **Flexible Checkout**: Enroll in free courses instantly or purchase premium courses/bundles via Razorpay integration with coupon code discount redemption.
- **Course Discussions**: Threaded public Q&A forum on each lecture to ask questions and interact with instructors and peers.
- **Reviews & Ratings**: Rate courses, write detailed reviews, and browse peer feedback.
- **Certificates of Completion**: Automatically unlock customizable downloadable certificates of completion upon reaching 100% course progress.
- **Student Dashboard**: Track enrolled courses, completion percentages, quiz scores, and payment history in one place.

### 👨‍🏫 Instructor Suite
- **Course & Section Management**: Create, edit, publish, or archive courses with structured sections and lectures.
- **Video Upload Pipeline**: Upload video lectures via Multer to Cloudinary with automatic adaptive streaming (`m3u8` HLS profile) processing.
- **Automated AI Transcripts & Summaries**: One-click speech-to-text transcription via AssemblyAI (`universal-2` model) and AI key takeaway summaries via Groq (3–5 bullet points).
- **AI & Manual Quiz Generator**: Generate balanced 20-question quizzes automatically from lecture transcripts via Groq (tracked by daily quota: 5/day per course) or build custom quizzes with built-in difficulty split validation.
- **Coupons & Bundles**: Create custom percentage discount coupons (with usage limits and expiration dates) and bundle multiple courses at custom discounted prices (with dynamic pro-rata pricing for partially owned courses).
- **Revenue & Financial Analytics**: Comprehensive dashboard showing total earnings, monthly revenue charts, course breakdown, student counts, and transaction logs.
- **Refund Management**: Initiate full Razorpay refunds directly from the dashboard with automated enrollment revocation and email notification to students.

### 🛡️ Admin & Security Features
- **Account Moderation**: Admin account management, instructor account deactivation, and restoration flows (including auto-archiving/un-archiving courses).
- **Content Moderation**: Review and act on flagged reports regarding courses, reviews, or discussion posts.
- **Two-Factor Authentication (2FA)**: Optional email-based OTP 2FA during login for added user security.

---

## 2. Tech Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Routing**: React Router v7 (`react-router-dom`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI primitives (`@radix-ui/react-progress`), Lucide React icons
- **Media Playback**: `react-player`, `hls.js`
- **Animations & Toast**: `framer-motion`, `react-hot-toast`
- **HTTP Client**: Axios (with credentials support for cookie-based auth)

### Backend
- **Runtime & Framework**: Node.js v22 (ES Modules) + Express.js v4
- **Database & ODM**: MongoDB + Mongoose ODM v9
- **Authentication & Security**: JWT (Access & Refresh tokens in HTTP-only cookies), bcrypt (12 rounds password hashing), Helmet, express-rate-limit, express-mongo-sanitize, CORS
- **File Uploads**: Multer (disk storage staging) + Cloudinary SDK (image/video/raw storage & HLS profile generation)

### Third-Party Services & AI Integrations
- **AssemblyAI**: Automated speech-to-text video transcription (`universal-2` model)
- **Groq SDK**: High-speed AI inference (`llama-3.3-70b-versatile`) for AI quiz generation and doubt-clearing chatbot
- **Razorpay**: Payment gateway integration, order creation, HMAC-SHA256 raw-body webhook handling, and refund processing
- **Nodemailer**: Transporter for OTP verification, password reset links, and refund notification emails

### DevOps & Testing
- **Containerization**: Docker & Docker Compose
- **Testing**: Vitest + Supertest + `mongodb-memory-server`

---

## 3. System Architecture

### High-Level Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Client (React 19 SPA)  │
                          └─────────────┬────────────┘
                                        │ HTTP / REST / Cookies
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ Express API Gateway                                                            │
│ ┌───────────────┬─────────────────┬──────────┬───────────────┬───────────────┐ │
│ │ Helmet Header │ Global RateLim  │   CORS   │ MongoSanitize │ Error Handler │ │
│ └───────────────┴─────────────────┴──────────┴───────────────┴───────────────┘ │
└───────┬──────────────────────┬──────────────────────┬──────────────────┬───────┘
        │                      │                      │                  │
        ▼                      ▼                      ▼                  ▼
 ┌──────────────┐     ┌──────────────────┐   ┌─────────────────┐  ┌──────────────┐
 │  MongoDB     │     │    Cloudinary    │   │  AssemblyAI     │  │   Groq AI    │
 │ (Mongoose)   │     │ (Videos/Images)  │   │ (Transcriptions)│  │ (Quiz/Chat)  │
 └──────────────┘     └──────────────────┘   └─────────────────┘  └──────────────┘
        ▲                      ▲                      ▲                  ▲
        │                      │                      │                  │
 ┌──────┴──────┐      ┌────────┴─────────┐            │                  │
 │  Nodemailer │      │  Razorpay API    │────────────┘                  │
 │(SMTP Emails)│      │ (& Webhooks)     │───────────────────────────────┘
 └─────────────┘      └──────────────────┘
```

### Request Pipeline (`app.js`)
Every incoming HTTP request traverses the Express middleware chain in strict order:
1. **Helmet Security Headers**: Applied globally (with an exception path for the standalone backend password-reset page).
2. **Global Rate Limiter**: `express-rate-limit` (15-min window: 100 requests max in production / 1000 in dev).
3. **CORS Middleware**: Validates origins against `CORS_ORIGIN` with `credentials: true`.
4. **Razorpay Raw-Body Webhook Handler**: Route `/api/v1/payments/webhook` parses raw bytes with `express.raw({ type: "application/json" })` into `req.rawBody` before JSON parsing to preserve signature integrity.
5. **Body Parsers**: `express.json({ limit: "16kb" })` and `express.urlencoded({ extended: true, limit: "16kb" })`.
6. **Cookie Parser**: Reads access and refresh tokens from HTTP-only cookies.
7. **Mongo Sanitize**: Strips `$` and `.` characters to prevent NoSQL injection attacks.
8. **Module Routers**: 15 mounted feature routers under `/api/v1/...`.
9. **Centralized Error Handler**: Translates thrown `ApiError` exceptions into clean, standardized JSON responses.

---

### Core Workflows

#### 1. Authentication & User Lifecycle Flow

![Authentication & User Lifecycle Flow](docs/assets/auth-flow.svg)

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Instructor
    participant Client as React App
    participant API as Express API
    participant DB as MongoDB
    participant SMTP as Nodemailer

    User->>Client: Submit Registration Form
    Client->>API: POST /api/v1/users/register
    API->>API: Hash Password & Generate 6-digit OTP
    API->>DB: Save to PendingUser
    API->>SMTP: Send OTP Email
    API-->>Client: 201 Created — OTP Sent
    User->>Client: Enter OTP
    Client->>API: POST /api/v1/users/verify-email-otp
    API->>DB: Verify OTP hash & promote PendingUser -> User
    API-->>Client: 200 OK — Email Verified
    User->>Client: Login Credentials
    Client->>API: POST /api/v1/users/login
    API->>DB: Verify Password (bcrypt, 12 rounds)
    API-->>Client: 200 OK — Set HttpOnly Access & Refresh Cookies
```

#### 2. Course Creation, Video Upload & AI Processing Pipeline

![Course Creation & AI Processing Pipeline](docs/assets/video-pipeline.svg)

```mermaid
flowchart TD
    A[Instructor uploads Video] -->|Multer Staging| B[Upload to Cloudinary]
    B -->|Return Secure URL| C[Save Lecture Record]
    C -->|Trigger Async Transcript| D[AssemblyAI API: Speech-to-Text]
    D -->|Return Full Transcript| E[Save Transcript Record]
    E -->|Trigger AI Summarizer| F[Groq Llama 3.3: Key Takeaways]
    E -->|Trigger AI Quiz Gen| G[Groq Llama 3.3: 20 MCQs Split 5/10/5]
    F --> H[Lecture Status: Completed]
    G --> H[Lecture Status: Completed]
```

#### 3. Razorpay Payment & Webhook Verification Flow
1. **Order Creation**: Client calls `POST /api/v1/payments/create-order/:courseId`. Backend creates a Razorpay order via SDK and inserts a `Payment` record with status `pending`.
2. **Client Checkout**: Client renders Razorpay Checkout modal.
3. **Webhook Confirmation (Reliable Async path)**: Razorpay triggers `POST /api/v1/payments/webhook`. Backend reads `req.rawBody` and verifies the `x-razorpay-signature` header against `RAZORPAY_WEBHOOK_SECRET` using HMAC SHA-256. Upon signature match for `payment.captured`, `createEnrollment()` grants course access even if client callback is interrupted.
4. **Client Verification Callback**: Client submits payment signatures to `POST /api/v1/payments/verify` as an immediate user-facing confirmation fallback.

---

### Data Layer Overview (Mongoose Models)

- **`User`**: Account credentials, role (`student`, `instructor`, `admin`), profile details, enrolled courses, 2FA settings, and daily chatbot quota tracking.
- **`PendingUser`**: Temporary unverified signup records storing a SHA-256 hashed OTP and an `otpExpiresAt` timestamp; expiry is enforced in application code at verification time (10-minute window) rather than via a MongoDB TTL index.
- **`Course`**: Course metadata, category, level, pricing, publication/archive flags, instructor ref, and daily AI generation quota counters.
- **`Lecture`**: Video URL, public ID, duration, section grouping, free-preview flag, and processing status (`pending`, `transcribing`, `generating_quiz`, `completed`, `failed`).
- **`Transcript`**: Full transcript text, AssemblyAI reference ID, word-level timestamps, confidence scores, and AI summary takeaways.
- **`Quiz` & `QuizAttempt`**: 20-question quiz sets with 5/10/5 difficulty distribution, generated flag, and student attempt scoring logs.
- **`Enrollment`**: Links students to courses with completion tracking, completed lecture lists, and active status.
- **`Payment`**: Razorpay order/payment IDs, amount, currency, coupon details, status (`pending`, `completed`, `refunded`), and bundle association.
- **`Coupon`**: Course discount codes, percentage, max usage limits, expiration dates, and usage counters.
- **`Bundle`**: Grouped courses sold at a package price.
- **`Review`**, **`Discussion`**, **`Report`**: Community reviews, threaded lecture discussions, and user content moderation reports.

---

## 4. Project Structure

EduNexus uses a modular monorepo structure separating frontend UI components from backend business domains:

```
edunexus/
├── backend/
│   ├── src/
│   │   ├── app.js                   # Main Express application & middleware setup
│   │   ├── index.js                 # Server entry point & DB connection
│   │   ├── db/                      # MongoDB connection setup
│   │   ├── middlewares/             # Security, auth, role, rateLimit, error, multer
│   │   ├── services/                # Cross-module shared domain services (enrollment)
│   │   ├── utils/                   # Cloudinary, Groq, JWT, Email, ApiError, ApiResponse
│   │   └── modules/                 # Feature-based modular architecture
│   │       ├── user/                # Auth, Profile, 2FA, OTP, Reset Password
│   │       ├── course/              # Course CRUD, filtering, section management
│   │       ├── lecture/             # Video uploads, streaming details
│   │       ├── transcript/          # AssemblyAI integration & summary extraction
│   │       ├── quiz/                # AI quiz generation, manual quiz editor, attempts
│   │       ├── enrollment/          # Enrollment claims & progress tracking
│   │       ├── payment/             # Razorpay orders, webhooks, refunds, bundle orders
│   │       ├── revenue/             # Instructor revenue dashboard & stats
│   │       ├── chatbot/             # Groq RAG doubt assistant with quota limit
│   │       ├── review/              # Course ratings and reviews
│   │       ├── discussion/          # Threaded lecture Q&A discussions
│   │       ├── coupon/              # Discount coupon management
│   │       ├── bundle/              # Course bundle packages
│   │       └── report/              # User reporting & moderation
│   ├── test/                        # Vitest test suite + mongodb-memory-server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # React root mounting
│   │   ├── App.jsx                  # React Router routes & context layout
│   │   ├── lib/                     # Axios instance & API helper utilities
│   │   └── modules/                 # Modular feature pages & components
│   │       ├── auth/                # Login, Register, OTP Modal, Reset Password
│   │       ├── course/              # Catalog, Detail, Creation & Management views
│   │       ├── lecture/             # Player UI, Transcript panel, Notes tab
│   │       ├── quiz/                # Quiz player, result breakdown, instructor editor
│   │       ├── chatbot/             # Floating doubt assistant chat drawer
│   │       ├── user/                # Student dashboard, Instructor stats, Settings
│   │       ├── certificate/         # Certificate viewer & download PDF/print view
│   │       ├── bundle/              # Bundle purchase & detail pages
│   │       ├── report/              # Flag modal & report resolution view
│   │       └── shared/              # Navbar, Footer, UI components
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 5. Prerequisites

Before installing, ensure you have the following installed on your machine:
- **Node.js**: `v18.x` or higher (developed and tested on `v22.x`)
- **npm**: a recent version matching your Node install
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI
- **Docker & Docker Compose** *(Optional, for containerized deployment)*

### Third-Party Accounts & Credentials
- **Cloudinary**: For hosting lecture videos, thumbnails, and PDF attachments.
- **Razorpay Account**: For payment order creation and webhook verification.
- **AssemblyAI API Key**: For video transcriptions.
- **Groq API Key**: For AI quiz generation and RAG chatbot (`llama-3.3-70b-versatile`).
- **SMTP Provider**: Email credentials (e.g. Gmail App Password or SendGrid) for OTPs and notifications.

---

## 6. Environment Variables

Create a `.env` file inside the `backend/` directory based on `backend/.env.example`:

| Environment Variable | Description |
|---|---|
| `PORT` | Port number the backend server runs on (default: `8000`). |
| `MONGODB_URL` | MongoDB connection URI string. |
| `CORS_ORIGIN` | Allowed client origin for CORS (e.g. `http://localhost:5173`). |
| `NODE_ENV` | Application environment (`development`, `production`, or `test`). |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name. |
| `CLOUDINARY_API_KEY` | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret. |
| `ACCESS_TOKEN_SECRET` | Secret key used to sign JWT Access Tokens. |
| `ACCESS_TOKEN_EXPIRY` | Expiration time for Access Tokens (e.g. `1d`). |
| `REFRESH_TOKEN_SECRET` | Secret key used to sign JWT Refresh Tokens. |
| `REFRESH_TOKEN_EXPIRY` | Expiration time for Refresh Tokens (e.g. `10d`). |
| `BACKEND_URL` | Public base URL of the backend API (used for password reset links). |
| `FRONTEND_URL` | Public URL of the frontend SPA (used for CORS and redirect links). |
| `EMAIL_USER` | SMTP email sender address for Nodemailer. |
| `EMAIL_PASS` | SMTP email application password. |
| `ASSEMBLYAI_API_KEY` | API key for AssemblyAI transcription service. |
| `GROQ_API_KEY` | API key for Groq Cloud SDK. |
| `RAZORPAY_KEY_ID` | Razorpay Key ID. |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret configured in Razorpay Dashboard. |

---

## 7. Installation & Setup

### Option A: Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Vedant07022006/Edunexus-Platform.git
cd Edunexus-Platform
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and supply your connection strings and API keys
npm run dev
```
The backend API server will start on **`http://localhost:8000`**.

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on **`http://localhost:5173`**.

---

### Option B: Docker Compose (One-Command Setup)

To run both services seamlessly in containerized environments:

1. Ensure `backend/.env` exists and has valid configurations.
2. Run Docker Compose from the root directory:
```bash
docker-compose up --build
```
- **Backend Service**: Available on `http://localhost:8000`
- **Frontend Service**: Available on `http://localhost:5173`

---

## 8. API Endpoint Overview

All API routes are mounted under the `/api/v1` base path in `app.js`:

| Route Prefix | Module / Purpose | Key Operations |
|---|---|---|
| `/api/v1/users` | User & Auth Management | Register, Verify OTP, Login, Logout, Refresh Token, 2FA, Reset Password, Profile. |
| `/api/v1/courses` | Course Catalog & Management | Create, edit, publish, search, filter, and archive courses. |
| `/api/v1/lectures` | Lecture Management | Add lectures, upload video media via Multer, stream lecture data. |
| `/api/v1/transcripts` | Speech-to-Text Transcripts | Generate AssemblyAI transcript, extract AI takeaways, fetch transcript timestamps. |
| `/api/v1/quizzes` | Quiz Management | Generate AI 20-MCQ quizzes, edit quizzes manually, check daily quota. |
| `/api/v1/quiz-attempts` | Quiz Evaluation | Submit quiz attempts, compute scores, view detailed solution breakdowns. |
| `/api/v1/enrollments` | Student Enrollments | Enroll in free/paid courses, track video completion, issue certificates. |
| `/api/v1/payments` | Razorpay Payments | Create order, verify payment signature, process webhooks, execute refunds. |
| `/api/v1/revenue` | Instructor Revenue Stats | View instructor earnings summaries, monthly trends, and transaction history. |
| `/api/v1/chatbot` | AI Doubt Assistant | Ask doubt questions to Groq Llama 3.3, track 50-message daily usage quota. |
| `/api/v1/reviews` | Course Reviews | Submit ratings & written feedback, list course reviews. |
| `/api/v1/discussions` | Discussion Forum | Post lecture questions, submit threaded replies, mark answered status. |
| `/api/v1/coupons` | Discount Coupons | Create discount codes, validate coupon eligibility during checkout. |
| `/api/v1/bundles` | Course Bundles | Create multi-course packages, calculate dynamic unowned course prices. |
| `/api/v1/reports` | Content Moderation | Flag inappropriate content, admin resolution workflows. |

---

## 9. Testing Setup

The backend test suite is built with **Vitest**, **Supertest**, and **`mongodb-memory-server`**, enabling isolated integration testing without needing an external MongoDB instance or making live third-party API calls.

### Running Tests
Navigate to the `backend/` directory:

```bash
# Run all integration tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Generate test coverage reports
npm run test:coverage
```

### Test Suite Highlights
- **In-Memory Database**: `MongoMemoryServer` initializes automatically in `test/setup.js` before tests run and wipes collections between test files.
- **Mocked External APIs**: Mock wrappers for Nodemailer, Cloudinary, Razorpay, AssemblyAI, and Groq SDK prevent external network side effects during testing.

---

## 10. Security Notes

- **HTTP Security Headers**: Powered by `helmet()` to enforce CSP, frameguard, and XSS filtering.
- **Rate Limiting**: Protects against brute-force and Denial-of-Service attacks with `express-rate-limit`.
- **NoSQL Injection Defense**: `express-mongo-sanitize` strips malicious operator keys from request bodies, queries, and params.
- **Secure Token Strategy**: Short-lived Access Tokens paired with long-lived Refresh Tokens stored in `httpOnly`, `sameSite: strict`, `secure` cookies.
- **Webhook Integrity**: Razorpay webhook signatures are validated using HMAC-SHA256 over raw request buffers (`req.rawBody`) before JSON parsing.

---

## 11. Deployment Notes

- **Dockerized Containers**: Built using multi-stage lightweight Node 22 Alpine images (`node:22-alpine`).
- **Production Environment**: When deploying to production environments (e.g. AWS ECS, Render, DigitalOcean):
  1. Set `NODE_ENV=production` in environment configuration.
  2. Set `BACKEND_URL` and `FRONTEND_URL` to match your domain names.
  3. Ensure `RAZORPAY_WEBHOOK_SECRET` is set and registered in the Razorpay Dashboard.

---

## 12. Contributing

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit your Changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the Branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 13. License

Distributed under the **ISC License**. See package manifest for details.

---

## 14. Author

Created and maintained by **Vedant** ([@Vedant07022006](https://github.com/Vedant07022006)).
