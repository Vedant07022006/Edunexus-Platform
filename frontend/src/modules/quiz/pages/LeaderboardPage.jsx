import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getLeaderboard, getCourseById } from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import { Trophy, ArrowLeft, Loader2, Medal } from 'lucide-react';

const RANK_STYLE = {
  1: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  2: 'text-slate-400 border-slate-400/30 bg-slate-400/5',
  3: 'text-amber-600 border-amber-600/30 bg-amber-600/5',
};

export default function LeaderboardPage() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const [course, setCourse]         = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([getLeaderboard(courseId), getCourseById(courseId)])
      .then(([lbRes, courseRes]) => {
        setLeaderboard(lbRes.data.data.leaderboard || []);
        setCourse(courseRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12 max-w-2xl mx-auto px-4 sm:px-6">
        <Link to={`/learn/${courseId}`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 w-fit">
          <ArrowLeft size={14} /> Back to course
        </Link>

        <div className="flex items-center gap-2.5 mb-1">
          <Trophy size={22} className="text-yellow-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leaderboard</h1>
        </div>
        {course && <p className="text-sm text-slate-500 mb-8">{course.title}</p>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={24} />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-16">
            No quiz attempts yet — be the first to take a quiz in this course!
          </p>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.map((entry) => {
              const isMe = entry.userId === user?._id;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl border glass ${
                    RANK_STYLE[entry.rank] || 'border-slate-900/[0.06] dark:border-white/[0.06]'
                  } ${isMe ? 'ring-1 ring-primary-500/40' : ''}`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {entry.rank <= 3
                      ? <Medal size={18} className={RANK_STYLE[entry.rank].split(' ')[0]} />
                      : <span className="text-sm font-bold text-slate-500">#{entry.rank}</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {entry.fullName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {entry.fullName} {isMe && <span className="text-primary-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{entry.totalAttempts} attempt{entry.totalAttempts !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex-shrink-0">{entry.bestScore}%</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
