import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Play, Search, IndianRupee, GraduationCap, Gift } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Pagination from '../components/ui/Pagination';
import { getMyPurchases } from '../services/api.service';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'paid', 'free'];
const SORTS   = [{ value: 'newest', label: 'Latest first' }, { value: 'oldest', label: 'Oldest first' }];

export default function StudentPurchasesPage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [stats,       setStats]       = useState({ totalSpent: 0, totalEnrolled: 0, freeCount: 0 });
  const [pagination,  setPagination]  = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading,     setLoading]     = useState(true);

  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [sort,    setSort]    = useState('newest');
  const [page,    setPage]    = useState(1);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMyPurchases({ page, limit: 6, search, filter, sort });
      setEnrollments(data.data.enrollments);
      setStats(data.data.stats);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, sort]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filter, sort]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-sm text-slate-500">My Account</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">My Purchases</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">All your enrolled courses and payment history</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: IndianRupee, label: 'Total Spent',     value: `₹${stats.totalSpent}`,      color: 'text-primary-400' },
            { icon: GraduationCap, label: 'Courses Enrolled', value: stats.totalEnrolled,       color: 'text-emerald-400' },
            { icon: Gift,        label: 'Free Courses',    value: stats.freeCount,               color: 'text-yellow-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <Icon size={18} className={color} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm glass rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06]
                         text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <div className="flex gap-1 glass rounded-xl p-1 border border-slate-900/[0.06] dark:border-white/[0.06]">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f ? 'gradient-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm glass rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06]
                       text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500/50"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} style={{ background: '#1a1d2e' }}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Course Cards */}
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-32 animate-pulse border border-slate-900/[0.06] dark:border-white/[0.06]" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
            <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No courses found</h3>
            <p className="text-sm text-slate-500 mb-6">
              {search || filter !== 'all' ? 'Try adjusting your search or filters' : 'Enroll in a course to get started'}
            </p>
            <Link to="/courses">
              <button className="gradient-primary text-white text-sm font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
                Browse Courses
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment, i) => {
              const course = enrollment.course;
              if (!course) return null;

              return (
                <motion.div
                  key={enrollment._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-4 flex gap-4"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0">
                    {course.thumbnail?.url ? (
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={20} className="text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{course.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">by {course.instructor?.fullName}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${
                        course.isFree
                          ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-900/10 dark:border-white/10'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {course.isFree ? 'Free' : 'Paid'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary rounded-full transition-all duration-500"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">{enrollment.progress}%</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex gap-5 text-xs">
                        <div>
                          <p className="text-slate-500">Enrolled on</p>
                          <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{formatDate(enrollment.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Amount paid</p>
                          <p className={`font-medium mt-0.5 ${course.isFree ? 'text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {course.isFree ? 'Free' : `₹${course.price}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Payment</p>
                          <p className="text-emerald-400 font-medium mt-0.5">
                            {course.isFree ? 'Free' : 'Completed'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/learn/${course._id}`)}
                        className="flex items-center gap-1.5 text-xs font-medium px-4 py-2
                                   gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Play size={12} fill="white" /> Continue Learning
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />

      </div>
    </div>
  );
}
