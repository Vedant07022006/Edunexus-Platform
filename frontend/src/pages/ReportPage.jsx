import { useState, useEffect } from 'react';
import { getMyReports, resolveReport } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import { Flag, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const load = () => {
    getMyReports()
      .then(({ data }) => setReports(data.data.reports))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleResolve = async (reportId, status) => {
    setResolvingId(reportId);
    try {
      await resolveReport(reportId, status);
      setReports((p) => p.filter((r) => r._id !== reportId));
      toast.success(status === 'reviewed' ? 'Marked as reviewed' : 'Dismissed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 mb-8">
          <Flag size={22} className="text-yellow-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Moderation Queue</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={24} />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-16">No pending reports. All clear!</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r._id} className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    {r.targetType}
                  </span>
                  <span className="text-xs text-slate-500">{r.course?.title}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{r.reason}</p>
                <p className="text-xs text-slate-500 mb-3">Reported by {r.reporter?.fullName}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(r._id, 'reviewed')}
                    disabled={resolvingId === r._id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    <Check size={12} /> Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleResolve(r._id, 'dismissed')}
                    disabled={resolvingId === r._id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-900/10 dark:hover:bg-white/10 disabled:opacity-60"
                  >
                    <X size={12} /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
