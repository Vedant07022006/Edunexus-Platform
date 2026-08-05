import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, IndianRupee, TrendingUp,
  Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Pagination from '../components/ui/Pagination';
import { getRevenueStats, getRevenueCourses } from '../services/api.service';
import toast from 'react-hot-toast';

const SORTS = [
  { value: 'revenue',  label: 'Most revenue' },
  { value: 'students', label: 'Most students' },
  { value: 'newest',   label: 'Newest' },
];

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-purple-500/20 text-purple-400',
  'bg-pink-500/20 text-pink-400',
];

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const getColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function InstructorRevenuePage() {
  const [stats,      setStats]      = useState(null);
  const [courses,    setCourses]    = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);

  // Which course is expanded — only one at a time
  const [expandedId,   setExpandedId]   = useState(null);
  // Show all students toggle per course
  const [showAllMap,   setShowAllMap]   = useState({});

  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState('revenue');
  const [page,   setPage]   = useState(1);

  // Fetch stats once
  useEffect(() => {
    getRevenueStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => toast.error('Failed to load stats'));
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getRevenueCourses({ page, limit: 5, search, sort });
      setCourses(data.data.courses);
      setPagination(data.data.pagination);
      // Reset expanded state on new fetch
      setExpandedId(null);
      setShowAllMap({});
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [page, search, sort]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { setPage(1); }, [search, sort]);

  const toggleCourse = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const toggleShowAll = (id) =>
    setShowAllMap((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-sm text-slate-500">Instructor</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">Revenue Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Track your earnings and student enrollments per course</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: IndianRupee, label: 'Total Revenue',  value: stats ? `₹${stats.totalRevenue}`    : '—', color: 'text-primary-400' },
            { icon: TrendingUp,  label: 'This Month',     value: stats ? `₹${stats.thisMonthRevenue}` : '—', color: 'text-emerald-400' },
            { icon: Users,       label: 'Total Students', value: stats ? stats.totalStudents           : '—', color: 'text-yellow-400' },
            { icon: BookOpen,    label: 'Total Courses',  value: stats ? stats.totalCourses            : '—', color: 'text-purple-400' },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]"
            >
              <Icon size={18} className={color} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search + Sort */}
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

        {/* Course list */}
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-20 animate-pulse border border-slate-900/[0.06] dark:border-white/[0.06]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
            <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No courses found</h3>
            <p className="text-sm text-slate-500">
              {search ? 'Try adjusting your search' : 'Create a course to start earning'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, i) => {
              const isExpanded = expandedId === course._id;
              const showAll    = showAllMap[course._id];
              const visibleStudents = showAll
                ? course.students
                : course.students.slice(0, 3);

              return (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass rounded-2xl border overflow-hidden transition-all ${
                    isExpanded ? 'border-primary-500/30' : 'border-slate-900/[0.06] dark:border-white/[0.06]'
                  }`}
                >
                  {/* ── Course header — clickable to expand ── */}
                  <button
                    onClick={() => toggleCourse(course._id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-10 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0">
                      {course.thumbnail?.url ? (
                        <img
                          src={course.thumbnail.url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={16} className="text-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* Course info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course.isFree ? 'Free course' : `₹${course.price} per student`}
                        {' · '}
                        {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Revenue */}
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className={`text-base font-bold mt-0.5 ${
                        course.isFree ? 'text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {course.isFree ? 'Free' : `₹${course.revenue}`}
                      </p>
                    </div>

                    {/* Expand arrow */}
                    <div className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={16} className="text-slate-600 dark:text-slate-400" />
                    </div>
                  </button>

                  {/* ── Student list — shown when expanded ── */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-slate-900/[0.06] dark:border-white/[0.06] pt-3">
                          {course.students.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-3">
                              No students enrolled yet
                            </p>
                          ) : (
                            <>
                              <div className="space-y-3">
                                {visibleStudents.map((student, j) => (
                                  <div key={j} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                                      text-xs font-semibold flex-shrink-0 ${getColor(student.studentName)}`}>
                                        {getInitials(student.studentName)}
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-900 dark:text-white">{student.studentName}</p>
                                        <p className="text-xs text-slate-500">
                                          Enrolled {formatDate(student.enrolledAt)}
                                        </p>
                                      </div>
                                    </div>
                                    <p className={`text-sm font-medium ${
                                      student.amountPaid === 0 ? 'text-emerald-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {student.amountPaid === 0 ? 'Free' : `₹${student.amountPaid}`}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Show all / Show less */}
                              {course.students.length > 3 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleShowAll(course._id); }}
                                  className="mt-3 flex items-center gap-1 text-xs text-primary-400
                                             hover:text-primary-300 transition-colors"
                                >
                                  {showAll ? (
                                    <><ChevronUp size={13} /> Show less</>
                                  ) : (
                                    <><ChevronDown size={13} /> Show all {course.students.length} students</>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
