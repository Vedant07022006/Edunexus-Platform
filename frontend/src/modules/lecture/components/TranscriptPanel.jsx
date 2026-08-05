import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, AlertCircle } from 'lucide-react';
import { getTranscriptForViewer } from '../../shared/services/api.service';

const CHUNK_SIZE = 14;

const formatTimestamp = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const buildChunks = (words) => {
  if (!Array.isArray(words) || words.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const slice = words.slice(i, i + CHUNK_SIZE);
    chunks.push({
      text: slice.map((w) => w.text).join(' '),
      startSeconds: (slice[0]?.start || 0) / 1000,
    });
  }
  return chunks;
};

export default function TranscriptPanel({ lectureId, videoRef, hasAccess }) {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [query, setQuery]           = useState('');

  useEffect(() => {
    if (!hasAccess || !lectureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setTranscript(null);

    getTranscriptForViewer(lectureId)
      .then(({ data }) => setTranscript(data.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Transcript not available for this lecture")
      )
      .finally(() => setLoading(false));
  }, [lectureId, hasAccess]);

  const chunks = useMemo(() => buildChunks(transcript?.timestamps), [transcript]);

  const filteredChunks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chunks;
    return chunks.filter((c) => c.text.toLowerCase().includes(q));
  }, [chunks, query]);

  const jumpTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!hasAccess) {
    return (
      <div className="glass rounded-2xl p-8 border border-slate-900/[0.06] dark:border-white/[0.06] text-center">
        <FileText size={36} className="text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Purchase the course to access this lecture's transcript.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 border border-slate-900/[0.06] dark:border-white/[0.06] flex justify-center">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 border border-slate-900/[0.06] dark:border-white/[0.06] text-center">
        <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden">
      <div className="p-4 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this lecture's transcript..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {filteredChunks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            {query ? 'No matches found.' : 'Transcript not available.'}
          </p>
        ) : (
          filteredChunks.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(c.startSeconds)}
              className="w-full text-left p-3 rounded-xl hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors mb-1 flex items-start gap-3"
            >
              <span className="text-xs font-mono text-primary-400 flex-shrink-0 mt-0.5">
                {formatTimestamp(c.startSeconds)}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.text}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
