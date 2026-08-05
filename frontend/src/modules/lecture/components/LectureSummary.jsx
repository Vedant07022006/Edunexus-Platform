import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getTranscriptForViewer } from '../../shared/services/api.service';

export default function LectureSummary({ lectureId, hasAccess }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasAccess || !lectureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSummary(null);

    getTranscriptForViewer(lectureId)
      .then(({ data }) => {
        if (data.data?.summaryStatus === 'completed' && data.data.summary?.length > 0) {
          setSummary(data.data.summary);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lectureId, hasAccess]);

  if (!hasAccess || loading || !summary) return null;

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-yellow-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Key Takeaways</h3>
      </div>
      <ul className="space-y-2">
        {summary.map((point, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
