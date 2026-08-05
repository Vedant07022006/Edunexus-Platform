import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Play, Search, IndianRupee, GraduationCap, Gift } from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import Pagination from '../../shared/components/Pagination';
import { getMyPurchases } from '../../shared/services/api.service';
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, sort]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Purchases & Enrollments</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            View all courses you have enrolled in or purchased along with order details.
          </p>
        </motion.div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
              <IndianRupee size={18} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Amount Invested</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center mb-3">
              <GraduationCap size={18} className="text-primary-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEnrolled}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Courses Enrolled</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
              <Gift size={18} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.freeCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Free Courses</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search enrolled courses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex glass rounded-xl p-1 border border-slate-900/10 dark:border-white/10">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filter === f
                      ? 'gradient-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="glass border border-slate-900/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 h-24 animate-pulse border border-slate-900/[0.06] dark:border-white/[0.06]" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
            <BookOpen size={48} className="text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No purchases found</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              {search ? 'Try clearing your search query' : 'You haven’t enrolled in any courses yet.'}
            </p>
            <Link
              to="/courses"
              className="gradient-primary text-white text-sm font-medium px-6 py-3 rounded-xl inline-block hover:opacity-90 transition-opacity glow-sm"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map(({ course, progress, createdAt }) => {
              const isFree = course.isFree;
              const price  = course.price;

              return (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {course.thumbnail?.url ? (
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl gradient-card flex items-center justify-center flex-shrink-0">
                        <BookOpen size={24} className="text-primary-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                          {course.title}
                        </h3>
                        {isFree ? (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                            Free
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded-full">
                            Paid
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        Instructor: {course.instructor?.fullName || 'EduNexus Instructor'} · Enrolled on {formatDate(createdAt)}
                      </p>

                      <div className="mt-2 flex items-center gap-3 max-w-xs">
                        <div className="flex-1 bg-slate-900/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="gradient-primary h-full rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{progress}% completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-900/10 dark:border-white/10">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {isFree ? 'Free' : `₹${price.toLocaleString()}`}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/learn/${course._id}`)}
                      className="gradient-primary text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 glow-sm"
                    >
                      <Play size={13} fill="currentColor" /> Resume Course
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
