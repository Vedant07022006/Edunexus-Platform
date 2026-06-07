import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/routes/ProtectedRoute';

// Pages
import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/auth/LoginPage';
import RegisterPage      from './pages/auth/RegisterPage';
import VerifyOtpPage        from './pages/auth/VerifyOtpPage';
import ForgotPasswordPage  from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage   from './pages/auth/ResetPasswordPage';
import StudentDashboard  from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import CoursesPage       from './pages/CoursesPage';
import CourseDetailPage  from './pages/CourseDetailPage';
import LearnPage         from './pages/LearnPage';
import ProfilePage       from './pages/ProfilePage';
import CreateCoursePage  from './pages/CreateCoursePage';
import ManageCoursePage  from './pages/ManageCoursePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e35',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/courses"  element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />

          {/* Auth — redirect if already logged in */}
          <Route path="/login"      element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"   element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Student Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/learn/:courseId" element={
            <ProtectedRoute><LearnPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Instructor Protected */}
          <Route path="/instructor" element={
            <ProtectedRoute role="instructor"><InstructorDashboard /></ProtectedRoute>
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
              <h2 className="text-2xl font-bold text-white mb-2">Page not found</h2>
              <p className="text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
              <a href="/" className="gradient-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Go Home
              </a>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
