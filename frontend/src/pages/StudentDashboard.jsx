import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyEnrollments } from '../services/api.service';
import CourseCard, { CourseCardSkeleton } from '../components/courses/CourseCard';
import Navbar from '../components/layout/Navbar';
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

  // NEW — Phase 3: badges computed on-the-fly from data already fetched —
  // no backend model needed, always in sync with real activity.
  const badges = [
    { id: 'first-course',  label: 'First Steps',     desc: 'Enrolled in your first course',  earned: enrollments.length >= 1 },
    { id: 'five-complete', label: 'Course Crusher',  desc: 'Completed 5 courses',             earned: completed >= 5 },
    { id: 'streak-7',      label: 'Week Warrior',    desc: '7-day learning streak',           earned: (user?.longestStreak || 0) >= 7 },
    { id: 'streak-30',     label: 'Unstoppable',     desc: '30-day learning streak',          earned: (user?.longestStreak || 0) >= 30 },
    { id: 'first-complete',label: 'Finisher',        desc: 'Completed your first course',     earned: completed >= 1 },
  ];
  const earnedBadges = badges.filter((b) => b.earned);

  const stats = [
    { icon: BookOpen,    label: 'Enrolled',    value: enrollments.length,          color: 'text-primary-400' },
    { icon: Trophy,      label: 'Completed',   value: completed,                   color: 'text-yellow-400' },
    { icon: TrendingUp,  label: 'Avg Progress',value: `${avgProgress}%`,           color: 'text-emerald-400' },
    { icon: Clock,       label: 'In Progress', value: enrollments.length - completed, color: 'text-purple-400' },
    { icon: Flame,       label: 'Day Streak',  value: user?.currentStreak || 0,    color: 'text-orange-400' }, // NEW — Phase 3
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {user?.fullName} <span className="wave">👋</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Here's your learning progress</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]"
            >
              <Icon size={20} className={color} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Badges — NEW, Phase 3 */}
        {earnedBadges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Award size={16} className="text-yellow-400" /> Badges Earned
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {earnedBadges.map((b) => (
                <div
                  key={b.id}
                  title={b.desc}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass border border-yellow-500/20 bg-yellow-500/5"
                >
                  <Award size={14} className="text-yellow-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="mb-8">
          <Link
            to="/dashboard/purchases"
            className="inline-flex items-center gap-2 text-sm glass border border-slate-900/[0.06] dark:border-white/[0.06]
                       rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <Receipt size={15} className="text-primary-400" />
            View My Purchases & Payment History
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* My Courses */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Courses</h2>
          <Link to="/courses" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            Explore more <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(3).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
            <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No courses yet</h3>
            <p className="text-sm text-slate-500 mb-6">Start your learning journey today</p>
            <Link to="/courses">
              <button className="gradient-primary text-white text-sm font-medium px-6 py-3 rounded-xl glow-sm hover:opacity-90 transition-opacity">
                Browse Courses
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enrollment, i) => (
              <motion.div
                key={enrollment._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/learn/${enrollment.course._id}`}>
                  <div className="glass rounded-2xl overflow-hidden border border-slate-900/[0.06] dark:border-white/[0.06] card-hover group">
                    <div className="relative aspect-video bg-surface-3">
                      {enrollment.course.thumbnail?.url ? (
                        <img
                          src={enrollment.course.thumbnail.url}
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={32} className="text-primary-400 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                          <Play size={18} className="text-white ml-1" fill="white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{enrollment.course.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{enrollment.course.instructor?.fullName}</p>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span><span>{enrollment.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-primary rounded-full transition-all duration-500"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Certificate link — NEW, Phase 3 — shown only when complete */}
                {enrollment.progress === 100 && (
                  <Link
                    to={`/certificate/${enrollment.course._id}`}
                    className="flex items-center gap-1.5 justify-center mt-2 text-xs font-medium text-yellow-400 hover:text-yellow-300 py-1.5"
                  >
                    <Award size={12} /> View Certificate
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
