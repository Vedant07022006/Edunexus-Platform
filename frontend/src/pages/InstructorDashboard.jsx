import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyCourses } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import {
  BookOpen, Users, Plus, Eye, Settings,
  CheckCircle, Clock, ArrowRight, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCourses()
      .then(({ data }) => setCourses(data.data.courses))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = courses.reduce((s, c) => s + c.totalEnrollments, 0);
  const published     = courses.filter((c) => c.isPublished).length;

  const stats = [
    { icon: BookOpen,     label: 'My Courses',     value: courses.length,             color: 'text-primary-400' },
    { icon: Users,        label: 'Total Students', value: totalStudents,              color: 'text-emerald-400' },
    { icon: CheckCircle,  label: 'Published',      value: published,                  color: 'text-yellow-400' },
    { icon: Clock,        label: 'Drafts',          value: courses.length - published, color: 'text-purple-400' },
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
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0">
                  {course.thumbnail?.url
                    ? <img src={course.thumbnail.url} alt={course.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-slate-600" /></div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{course.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={11} />{course.totalEnrollments} students</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} />{course.totalLectures} lectures</span>
                    {course.isFree
                      ? <span className="text-emerald-400">Free</span>
                      : <span className="text-slate-400">₹{course.price}</span>
                    }
                  </div>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  course.isPublished
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>

                <div className="flex items-center gap-2">
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
    </div>
  );
}
