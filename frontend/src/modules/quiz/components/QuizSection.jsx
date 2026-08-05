import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getQuizByLecture, submitQuiz, getMyAttempts } from '../../shared/services/api.service';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../shared/components/Button';
import { CheckCircle, XCircle, RotateCcw, AlertCircle, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizSection({ lectureId }) {
  const { user } = useAuth();

  const [quiz, setQuiz]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [answers, setAnswers]       = useState({});
  const [result, setResult]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [view, setView]             = useState('quiz');

  const startTimeRef = useRef(null);

  useEffect(() => {
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setView('quiz');
    startTimeRef.current = null;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getQuizByLecture(lectureId);
        setQuiz(data.data);
        startTimeRef.current = Date.now();

        if (user) {
          const { data: attData } = await getMyAttempts(lectureId);
          setPastAttempts(attData.data.attempts);
        }
      } catch {
        // no quiz
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lectureId, user]);

  const handleSelect = (questionId, option) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!user) return toast.error('Login to submit quiz');

    const formatted = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

    if (formatted.length < quiz.questions.length) {
      return toast.error('Please answer all questions before submitting');
    }

    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    setSubmitting(true);
    try {
      const { data } = await submitQuiz(lectureId, { answers: formatted, timeTakenInSeconds: timeTaken });
      setResult(data.data);
      setView('result');

      if (user) {
        const { data: attData } = await getMyAttempts(lectureId);
        setPastAttempts(attData.data.attempts);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setView('quiz');
    startTimeRef.current = Date.now();
  };

  if (loading) return (
    <div className="h-20 flex items-center justify-center text-slate-500 text-sm">
      Loading quiz...
    </div>
  );

  if (!quiz) return (
    <div className="glass rounded-2xl p-6 text-center border border-slate-900/[0.06] dark:border-white/[0.06]">
      <AlertCircle size={32} className="text-slate-500 mx-auto mb-2" />
      <p className="text-sm text-slate-600 dark:text-slate-400">No quiz available for this lecture yet.</p>
    </div>
  );

  const answeredCount  = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;
  const allAnswered    = answeredCount === totalQuestions;

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden">
      <div className="flex border-b border-slate-900/[0.06] dark:border-white/[0.06] p-1 gap-1">
        {[
          { id: 'quiz',    label: 'Quiz' },
          { id: 'result',  label: 'Result',  disabled: !result },
          { id: 'history', label: `History (${pastAttempts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setView(tab.id)}
            disabled={tab.disabled}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              view === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">

        {view === 'quiz' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{quiz.title || 'Lecture Quiz'}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Timer size={12} /> {answeredCount}/{totalQuestions} answered
                </span>
                <span>Passing: {quiz.passingScore}%</span>
              </div>
            </div>

            <div className="h-1 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>

            {quiz.questions.map((q, i) => (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 glass rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06]"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                  {i + 1}. {q.questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q._id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(q._id, opt)}
                        className={`text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${
                          selected
                            ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                            : 'border-slate-900/10 dark:border-white/10 bg-slate-900/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-900/15 dark:hover:border-white/20 hover:bg-slate-900/10 dark:hover:bg-white/10'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!allAnswered}
              size="lg"
              className="w-full"
            >
              {allAnswered ? 'Submit Quiz' : `Answer all questions (${answeredCount}/${totalQuestions})`}
            </Button>
          </div>
        )}

        {view === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold ${
              result.isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {result.score}%
            </div>
            <h3 className={`text-xl font-bold mb-1 ${result.isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.isPassed ? '🎉 Passed!' : '❌ Not Passed'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {result.totalCorrect}/{result.totalQuestions} correct answers
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Score',   value: `${result.score}%` },
                { label: 'Correct', value: result.totalCorrect },
                { label: 'Attempt', value: `#${result.attemptNumber}` },
              ].map((s) => (
                <div key={s.label} className="glass rounded-xl p-3">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={handleRetry}>
              <RotateCcw size={15} /> Try Again
            </Button>
          </motion.div>
        )}

        {view === 'history' && (
          <div className="space-y-3">
            {pastAttempts.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">No attempts yet</p>
            ) : pastAttempts.map((a) => (
              <div key={a._id} className="flex items-center justify-between p-3 glass rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06]">
                <div>
                  <p className="text-xs text-slate-500">Attempt #{a.attemptNumber}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.score}% score</p>
                </div>
                {a.isPassed
                  ? <CheckCircle size={18} className="text-emerald-400" />
                  : <XCircle size={18} className="text-red-400" />
                }
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
