import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourseAnalytics } from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import { BarChart3, ArrowLeft, Loader2, Users, TrendingUp, Brain } from 'lucide-react';

export default function CourseAnalyticsPage() {
  const { courseId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourseAnalytics(courseId)
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={28} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="pt-32 text-center text-slate-500">Failed to load analytics.</p>
      </div>
    );
  }

  const cards = [
    { icon: Users,      label: 'Enrolled Students', value: stats.totalStudents, color: 'text-primary-400' },
    { icon: TrendingUp, label: 'Completion Rate',   value: `${stats.completionRate}%`, color: 'text-emerald-400' },
    { icon: Brain,      label: 'Avg Quiz Score',    value: stats.avgQuizScore !== null ? `${stats.avgQuizScore}%` : 'N/A', color: 'text-yellow-400' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12 max-w-3xl mx-auto px-4 sm:px-6">
        <Link to={`/instructor/courses/${courseId}`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 w-fit">
          <ArrowLeft size={14} /> Back to course
        </Link>

        <div className="flex items-center gap-2.5 mb-8">
          <BarChart3 size={22} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Course Analytics</h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-2xl p-5 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <Icon size={20} className={color} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Lecture Drop-off</h2>
        <div className="space-y-2">
          {stats.dropOff.map((d) => (
            <div key={d.lectureId} className="glass rounded-xl p-3.5 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{d.order}. {d.title}</p>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{d.reachedPercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full gradient-primary" style={{ width: `${d.reachedPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
