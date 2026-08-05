import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './modules/auth/AuthContext';
import { ThemeProvider } from './modules/shared/context/ThemeContext';
import { ProtectedRoute, PublicRoute } from './modules/shared/components/ProtectedRoute';

// Pages
import LandingPage          from './modules/landing/pages/LandingPage';
import LoginPage            from './modules/auth/pages/LoginPage';
import RegisterPage         from './modules/auth/pages/RegisterPage';
import VerifyOtpPage        from './modules/auth/pages/VerifyOtpPage';
import ForgotPasswordPage   from './modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage    from './modules/auth/pages/ResetPasswordPage';
import StudentDashboard     from './modules/user/pages/StudentDashboard';
import InstructorDashboard  from './modules/course/pages/InstructorDashboard';
import CoursesPage          from './modules/course/pages/CoursesPage';
import CourseDetailPage     from './modules/course/pages/CourseDetailPage';
import LearnPage            from './modules/lecture/pages/LearnPage';
import ProfilePage          from './modules/user/pages/ProfilePage';
import CreateCoursePage     from './modules/course/pages/CreateCoursePage';
import ManageCoursePage     from './modules/course/pages/ManageCoursePage';
import StudentPurchasesPage from './modules/user/pages/StudentPurchasesPage';
import InstructorRevenuePage from './modules/course/pages/InstructorRevenuePage';
import QuizPage              from './modules/quiz/pages/QuizPage';
import QuizResultPage        from './modules/quiz/pages/QuizResultPage';
import CertificatePage       from './modules/certificate/pages/CertificatePage';
import LeaderboardPage       from './modules/quiz/pages/LeaderboardPage';
import ReportsPage           from './modules/report/pages/ReportPage';
import CourseAnalyticsPage   from './modules/course/pages/CourseAnalyticsPage';
import BundlesPage           from './modules/bundle/pages/BundlePage';
import CreateBundlePage      from './modules/bundle/pages/CreateBundlePage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background:   'var(--color-surface-3)',
                color:        'var(--color-text)',
                border:       '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize:     '14px',
              },
              success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
            }}
          />

        <Routes>
          {/* Public */}
          <Route path="/"        element={<LandingPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />

          {/* Auth */}
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Student */}
          <Route path="/dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/dashboard/purchases" element={
            <ProtectedRoute role="student"><StudentPurchasesPage /></ProtectedRoute>
          } />
          <Route path="/learn/:courseId" element={
            <ProtectedRoute><LearnPage /></ProtectedRoute>
          } />
          <Route path="/quiz/:lectureId" element={
            <ProtectedRoute><QuizPage /></ProtectedRoute>
          } />
          <Route path="/quiz/:lectureId/result" element={
            <ProtectedRoute><QuizResultPage /></ProtectedRoute>
          } />
          <Route path="/certificate/:courseId" element={
            <ProtectedRoute role="student"><CertificatePage /></ProtectedRoute>
          } />
          <Route path="/leaderboard/:courseId" element={
            <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
          } />
          <Route path="/instructor/reports" element={
            <ProtectedRoute role="instructor"><ReportsPage /></ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId/analytics" element={
            <ProtectedRoute role="instructor"><CourseAnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/instructor/bundles/create" element={
            <ProtectedRoute role="instructor"><CreateBundlePage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Instructor */}
          <Route path="/instructor" element={
            <ProtectedRoute role="instructor"><InstructorDashboard /></ProtectedRoute>
          } />
          <Route path="/instructor/revenue" element={
            <ProtectedRoute role="instructor"><InstructorRevenuePage /></ProtectedRoute>
          } />
          <Route path="/instructor/create-course" element={
            <ProtectedRoute role="instructor"><CreateCoursePage /></ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId" element={
            <ProtectedRoute role="instructor"><ManageCoursePage /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
              <p className="text-8xl font-black gradient-text mb-4">404</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page not found</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
              <a href="/" className="gradient-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Go Home
              </a>
            </div>
          } />
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
