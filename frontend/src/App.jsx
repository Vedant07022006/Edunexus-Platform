import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // NEW
import { ProtectedRoute, PublicRoute } from './components/routes/ProtectedRoute';

// Pages
import LandingPage          from './pages/LandingPage';
import LoginPage            from './pages/auth/LoginPage';
import RegisterPage         from './pages/auth/RegisterPage';
import VerifyOtpPage        from './pages/auth/VerifyOtpPage';
import ForgotPasswordPage   from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage    from './pages/auth/ResetPasswordPage';
import StudentDashboard     from './pages/StudentDashboard';
import InstructorDashboard  from './pages/InstructorDashboard';
import CoursesPage          from './pages/CoursesPage';
import CourseDetailPage     from './pages/CourseDetailPage';
import LearnPage            from './pages/LearnPage';
import ProfilePage          from './pages/ProfilePage';
import CreateCoursePage     from './pages/CreateCoursePage';
import ManageCoursePage     from './pages/ManageCoursePage';
import StudentPurchasesPage from './pages/StudentPurchasesPage';   // NEW
import InstructorRevenuePage from './pages/InstructorRevenuePage'; // NEW
import QuizPage              from './pages/QuizPage';              // NEW
import QuizResultPage        from './pages/QuizResultPage';        // NEW (placeholder this slice)
import CertificatePage       from './pages/CertificatePage';       // NEW — Phase 3
import LeaderboardPage       from './pages/LeaderboardPage';       // NEW — Phase 3
import ReportsPage           from './pages/ReportPage';            // NEW — Phase 5 (file: ReportPage.jsx)
import CourseAnalyticsPage   from './pages/CourseAnalyticsPage';   // NEW — Phase 4
import BundlesPage           from './pages/BundlePage';            // NEW — Phase 4 (file: BundlePage.jsx)
import CreateBundlePage      from './pages/CreateBundlePage';      // NEW — Phase 4

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background:   'var(--color-surface-3)', // was hardcoded '#1e1e35'
                color:        'var(--color-text)',       // was hardcoded '#e2e8f0'
                border:       '1px solid var(--color-border)', // was hardcoded rgba(255,255,255,0.08)
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
