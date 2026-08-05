import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getMyEnrollments } from '../../shared/services/api.service';
import CourseCard, { CourseCardSkeleton } from '../../course/components/CourseCard';
import Navbar from '../../shared/components/Navbar';
import { BookOpen, Clock, Trophy, TrendingUp, Play, ArrowRight, Receipt, Flame, Award } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    getMyEnrollments()
      .then(({ data }) => setEnrollments(data.data.enrollments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
    : 0;
  const completed = enrollments.filter((e) => e.progress === 100).length;

  const currentStreak = user?.currentStreak || 0;
  const longestStreak = user?.longestStreak || 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, <span className="gradient-text">{user?.fullName?.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Continue learning where you left off.</p>
          </div>
          <Link
            to="/dashboard/purchases"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-slate-900/10 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 transition-all w-fit"
          >
            <Receipt size={16} className="text-primary-400" />
            My Purchases & Invoices
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center mb-3">
              <BookOpen size={18} className="text-primary-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{enrollments.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Enrolled Courses</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgProgress}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Average Progress</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
              <Trophy size={18} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{completed}</p>
            <p className="text-xs text-slate-500 mt-0.5">Completed Courses</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
              <Flame size={18} className="text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentStreak} <span className="text-xs font-normal text-slate-500">days</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Current Streak</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06] col-span-2 md:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
              <Award size={18} className="text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{longestStreak} <span className="text-xs font-normal text-slate-500">days</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Best Streak</p>
          </div>
        </div>

        {/* Continue Learning */}
        {enrollments.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.slice(0, 2).map(({ course, progress, lastWatchedLecture }) => (
                <div key={course._id} className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06] flex items-center gap-4">
                  {course.thumbnail?.url ? (
                    <img src={course.thumbnail.url} alt={course.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl gradient-card flex items-center justify-center flex-shrink-0">
                      <BookOpen size={24} className="text-primary-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{course.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lastWatchedLecture ? `Last watched: ${lastWatchedLecture.title}` : 'Start learning'}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 bg-slate-900/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="gradient-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{progress}%</span>
                    </div>
                  </div>

                  <Link to={`/learn/${course._id}`} className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center text-white flex-shrink-0 hover:scale-105 transition-transform">
                    <Play size={16} fill="currentColor" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Enrolled Courses */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Enrolled Courses</h2>
            <Link to="/courses" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              Explore More <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array(3).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
              <BookOpen size={48} className="text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No courses enrolled yet</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Explore our marketplace and start learning today!</p>
              <Link to="/courses" className="gradient-primary text-white text-sm font-medium px-6 py-3 rounded-xl inline-block hover:opacity-90 transition-opacity glow-sm">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrollments.map(({ course, progress }, i) => (
                <div key={course._id} className="relative group">
                  <CourseCard course={course} index={i} />
                  <div className="mt-2 px-1 flex items-center justify-between">
                    <div className="flex-1 mr-3 bg-slate-900/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="gradient-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{progress}%</span>
                    {progress === 100 && (
                      <Link
                        to={`/certificate/${course._id}`}
                        className="ml-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        title="View Certificate"
                      >
                        <Award size={14} /> Cert
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
