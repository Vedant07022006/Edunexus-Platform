import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyCourses, getMyArchivedCourses, restoreCourse, getCourseEnrollments } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import {
  BookOpen, Users, Plus, Eye, Settings,
  CheckCircle, Clock, ArrowRight, TrendingUp,
  X, Mail, Calendar, BarChart2, ChevronRight,
  GraduationCap, Video, Archive, RotateCcw, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Student Detail Modal ──────────────────────────────────────────────────────
function StudentDetailModal({ student, course, onClose }) {
  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl border border-white/10 w-full max-w-md p-6 shadow-2xl"
        style={{ background: '#13131f' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Student Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {student.user?.fullName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{student.user?.fullName || 'Unknown'}</p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Mail size={12} /> {student.user?.email || '—'}
            </p>
          </div>
        </div>

        {/* Course info */}
        <div className="glass rounded-xl p-3 border border-white/[0.06] mb-4">
          <p className="text-xs text-slate-500 mb-1">Enrolled in</p>
          <p className="text-sm font-medium text-white truncate">{course.title}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={12} className="text-primary-400" />
              <p className="text-xs text-slate-500">Enrolled on</p>
            </div>
            <p className="text-sm font-semibold text-white">{formatDate(student.createdAt)}</p>
          </div>

          <div className="glass rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart2 size={12} className="text-emerald-400" />
              <p className="text-xs text-slate-500">Progress</p>
            </div>
            <p className="text-sm font-semibold text-white">{student.progress || 0}%</p>
          </div>

          <div className="glass rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <Video size={12} className="text-yellow-400" />
              <p className="text-xs text-slate-500">Lectures done</p>
            </div>
            <p className="text-sm font-semibold text-white">
              {student.completedLectures?.length || 0}
              <span className="text-slate-500 font-normal"> / {course.totalLectures || '—'}</span>
            </p>
          </div>

          <div className="glass rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <GraduationCap size={12} className="text-purple-400" />
              <p className="text-xs text-slate-500">Status</p>
            </div>
            <p className={`text-sm font-semibold ${
              student.progress === 100 ? 'text-emerald-400' : 'text-yellow-400'
            }`}>
              {student.progress === 100 ? 'Completed' : 'In Progress'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Course progress</span>
            <span>{student.progress || 0}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-500"
              style={{ width: `${student.progress || 0}%` }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Student List Modal ────────────────────────────────────────────────────────
function StudentListModal({ course, onClose }) {
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    getCourseEnrollments(course._id)
      .then(({ data }) => setStudents(data.data.enrollments))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [course._id]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden"
          style={{ background: '#13131f' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold text-white">Enrolled Students</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{course.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-primary-500/20 text-primary-300 px-2.5 py-1 rounded-full">
                {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Student list */}
          <div className="max-h-[420px] overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-2">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-14 glass rounded-xl animate-pulse border border-white/[0.06]" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users size={36} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No students enrolled yet</p>
                <p className="text-slate-600 text-xs mt-1">Students will appear here once they enroll</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student, i) => (
                  <motion.button
                    key={student._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(student)}
                    className="w-full flex items-center gap-3 p-3 glass rounded-xl border border-white/[0.06]
                               hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left group"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center
                                    text-white text-sm font-bold flex-shrink-0">
                      {student.user?.fullName?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {student.user?.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{student.user?.email || '—'}</p>
                    </div>

                    {/* Progress */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-semibold ${
                        student.progress === 100 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {student.progress || 0}%
                      </p>
                      <p className="text-xs text-slate-600">progress</p>
                    </div>

                    <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Student detail modal on top */}
      <AnimatePresence>
        {selected && (
          <StudentDetailModal
            student={selected}
            course={course}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [archivedCourses, setArchivedCourses] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(true);
  const [showArchived, setShowArchived]       = useState(false);
  const [restoringId, setRestoringId]         = useState(null);

  useEffect(() => {
    getMyCourses()
      .then(({ data }) => setCourses(data.data.courses))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));

    getMyArchivedCourses()
      .then(({ data }) => setArchivedCourses(data.data.courses))
      .catch(() => {}) // non-critical — fail silently, archived section just stays empty
      .finally(() => setArchivedLoading(false));
  }, []);

  const handleRestore = async (courseId) => {
    setRestoringId(courseId);
    try {
      const { data } = await restoreCourse(courseId);
      toast.success('Course restored successfully');
      setArchivedCourses((prev) => prev.filter((c) => c._id !== courseId));
      setCourses((prev) => [data.data, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore course');
    } finally {
      setRestoringId(null);
    }
  };

  const totalStudents = courses.reduce((s, c) => s + c.totalEnrollments, 0);
  const published     = courses.filter((c) => c.isPublished).length;

  const stats = [
    { icon: BookOpen,    label: 'My Courses',     value: courses.length,             color: 'text-primary-400' },
    { icon: Users,       label: 'Total Students', value: totalStudents,              color: 'text-emerald-400' },
    { icon: CheckCircle, label: 'Published',      value: published,                  color: 'text-yellow-400' },
    { icon: Clock,       label: 'Drafts',          value: courses.length - published, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-10 flex-wrap gap-4"
        >
          <div>
            <p className="text-sm text-slate-500">Instructor Dashboard</p>
            <h1 className="text-3xl font-bold text-white mt-1">Hello, {user?.fullName} 👋</h1>
            <p className="text-slate-400 mt-1 text-sm">Manage your courses and track performance</p>
          </div>
          <Link to="/instructor/create-course">
            <Button size="lg"><Plus size={18} /> Create Course</Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 border border-white/[0.06]"
            >
              <Icon size={20} className={color} />
              <p className="text-2xl font-bold text-white mt-3">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick link to Revenue */}
        <div className="mb-8">
          <Link
            to="/instructor/revenue"
            className="inline-flex items-center gap-2 text-sm glass border border-white/[0.06]
                       rounded-xl px-4 py-2.5 text-slate-300 hover:text-white transition-all"
          >
            <TrendingUp size={15} className="text-emerald-400" />
            View Revenue Dashboard & Student Payments
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Courses list */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">My Courses</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-20 animate-pulse border border-white/[0.06]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-white/[0.06]">
            <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No courses yet</h3>
            <p className="text-sm text-slate-500 mb-6">Create your first course and start teaching</p>
            <Link to="/instructor/create-course">
              <Button><Plus size={16} /> Create First Course</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, i) => (
              <motion.div
                key={course._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4 border border-white/[0.06] flex items-center gap-4"
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0">
                  {course.thumbnail?.url
                    ? <img src={course.thumbnail.url} alt={course.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-slate-600" /></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{course.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><BookOpen size={11} />{course.totalLectures} lectures</span>
                    {course.isFree
                      ? <span className="text-emerald-400">Free</span>
                      : <span className="text-slate-400">₹{course.price}</span>
                    }
                  </div>
                </div>

                {/* Status badge */}
                <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${
                  course.isPublished
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Students button */}
                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs
                               text-slate-300 hover:text-white border border-white/[0.06]
                               hover:border-primary-500/30 transition-all"
                  >
                    <Users size={12} className="text-primary-400" />
                    {course.totalEnrollments} Students
                  </button>

                  <Link to={`/courses/${course._id}`}>
                    <button className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-all">
                      <Eye size={15} />
                    </button>
                  </Link>
                  <Link to={`/instructor/courses/${course._id}`}>
                    <button className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-all">
                      <Settings size={15} />
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Archived Courses Section ── */}
      {!archivedLoading && archivedCourses.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="w-full flex items-center justify-between p-4 glass rounded-2xl border border-white/[0.06] hover:border-white/10 transition-all"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Archive size={15} className="text-slate-500" />
              Archived Courses
              <span className="text-xs bg-white/5 text-slate-500 px-2 py-0.5 rounded-full">{archivedCourses.length}</span>
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mt-3">
                  {archivedCourses.map((course) => (
                    <div
                      key={course._id}
                      className="glass rounded-2xl p-4 border border-white/[0.06] flex items-center gap-4 opacity-75"
                    >
                      <div className="w-16 h-12 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0 grayscale">
                        {course.thumbnail?.url
                          ? <img src={course.thumbnail.url} alt={course.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-slate-600" /></div>
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-300 text-sm truncate">{course.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen size={11} />{course.totalLectures} lectures</span>
                          <span className="flex items-center gap-1"><Users size={11} />{course.totalEnrollments} enrolled students keep access</span>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 flex-shrink-0">
                        Discontinued
                      </span>

                      <Button
                        size="sm"
                        variant="secondary"
                        loading={restoringId === course._id}
                        onClick={() => handleRestore(course._id)}
                      >
                        <RotateCcw size={13} /> Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Student List Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <StudentListModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
