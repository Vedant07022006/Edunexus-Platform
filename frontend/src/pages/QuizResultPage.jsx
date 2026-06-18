import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

// TEMPORARY placeholder for this slice — full per-question breakdown,
// correct/wrong answers, explanations, and the doubt chatbot are built
// in the next slice. This exists now only so the QuizPage submit flow
// has somewhere valid to land instead of hitting a 404.
export default function QuizResultPage() {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 text-center border border-white/[0.06] max-w-md w-full">
        <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-1">Quiz submitted</h2>
        {result ? (
          <>
            <p className="text-3xl font-bold text-white mt-3">{result.score}%</p>
            <p className="text-sm text-slate-400 mt-1">
              {result.totalCorrect} / {result.totalQuestions} correct
              {result.isAutoSubmitted && ' · auto-submitted'}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Result details will appear here.</p>
        )}
        <p className="text-xs text-slate-500 mt-4">
          A full result breakdown with explanations and a doubt chatbot is coming soon.
        </p>
        <button
          onClick={() => navigate(-2)}
          className="mt-6 gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to Lecture
        </button>
      </div>
    </div>
  );
}
