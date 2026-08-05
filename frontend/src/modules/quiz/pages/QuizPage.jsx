import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getQuizByLecture, checkQuizEligibility, submitQuiz,
} from '../../shared/services/api.service';
import { useAuth } from '../../auth/AuthContext';
import {
  Clock, Flag, ChevronLeft, ChevronRight,
  AlertTriangle, ShieldAlert, X, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TAB_SWITCH_LIMIT = 3;

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function QuizPage() {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);

  const startTimeRef = useRef(null);
  const submittedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: eligData } = await checkQuizEligibility(lectureId);
        if (!eligData.data.eligible) {
          setLoadError(eligData.data.message || 'You are not eligible to attempt this quiz right now');
          setLoading(false);
          return;
        }

        const { data: quizData } = await getQuizByLecture(lectureId);
        setQuiz(quizData.data);
        setSecondsLeft((quizData.data.timeLimit || 20) * 60);
        startTimeRef.current = Date.now();
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lectureId]);

  const doSubmit = useCallback(async (reason = null) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    const formattedAnswers = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

    const timeTakenInSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    try {
      const { data } = await submitQuiz(lectureId, {
        answers: formattedAnswers,
        timeTakenInSeconds,
        isAutoSubmitted: !!reason,
        autoSubmitReason: reason,
        tabSwitchCount: tabSwitchCountRef.current,
        flaggedQuestions: Array.from(flagged),
      });

      navigate(`/quiz/${lectureId}/result`, { state: { result: data.data, attemptJustSubmitted: true } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [answers, flagged, lectureId, navigate]);

  useEffect(() => {
    if (secondsLeft === null || submittedRef.current) return;

    if (secondsLeft <= 0) {
      toast.error('Time is up! Auto-submitting your quiz...');
      doSubmit('timer_expired');
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, doSubmit]);

  useEffect(() => {
    if (!quiz) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        tabSwitchCountRef.current += 1;
        setTabSwitchCount(tabSwitchCountRef.current);

        if (tabSwitchCountRef.current >= TAB_SWITCH_LIMIT) {
          toast.error('Too many tab switches detected. Auto-submitting your quiz.');
          doSubmit('tab_switch_limit');
        } else {
          setShowCheatWarning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quiz, doSubmit]);

  useEffect(() => {
    if (!quiz) return;

    const blockEvent = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const blocked =
        (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 's', 'p', 'u'].includes(e.key.toLowerCase());
      if (blocked || e.key === 'F12') e.preventDefault();
    };

    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('keydown', blockKeys);
    };
  }, [quiz]);

  useEffect(() => {
    if (!quiz) return;

    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        setShowCheatWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [quiz]);

  useEffect(() => {
    if (!quiz) return;
    const handleBeforeUnload = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [quiz]);

  const toggleFlag = (questionId) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  };

  const selectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center border border-slate-900/[0.06] dark:border-white/[0.06] max-w-md">
          <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Cannot start quiz</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{loadError}</p>
          <button
            onClick={() => navigate(-1)}
            className="gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const timeCritical = secondsLeft <= 120;
  const timeWarning = secondsLeft <= 300;

  return (
    <div
      className="min-h-screen relative"
      style={{ userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.04] overflow-hidden"
        aria-hidden="true"
      >
        <p className="text-6xl font-bold rotate-[-30deg] whitespace-nowrap text-slate-900 dark:text-white">
          {Array(20).fill(user?.email || user?.fullName || 'EduNexus').join('   ')}
        </p>
      </div>

      <div className="sticky top-0 z-20 glass border-b border-slate-900/[0.06] dark:border-white/[0.06] px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs">{quiz.title || 'Lecture Quiz'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Question {currentIndex + 1} of {totalQuestions}</p>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${
            timeCritical ? 'bg-red-500/20 text-red-400'
              : timeWarning ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-slate-900/5 dark:bg-white/5 text-slate-700 dark:text-slate-300'
          }`}>
            <Clock size={14} />
            {formatTime(secondsLeft)}
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            Submit Quiz
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 relative z-10">

        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-4">
            <p className="text-xs text-slate-500 mb-3">
              {answeredCount}/{totalQuestions} answered
              {flagged.size > 0 && ` · ${flagged.size} flagged`}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q._id];
                const isFlagged = flagged.has(q._id);
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIndex(i)}
                    className={`relative w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                      isCurrent ? 'ring-2 ring-primary-400' : ''
                    } ${
                      isFlagged
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-900/5 dark:bg-white/5 text-slate-500 border border-slate-900/10 dark:border-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-slate-500">
              <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40" /> Answered</p>
              <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500/40" /> Flagged</p>
              <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-900/10 dark:bg-white/10" /> Unanswered</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {currentQuestion && (
            <motion.div
              key={currentQuestion._id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                  {currentIndex + 1}. {currentQuestion.questionText}
                </p>
                <button
                  onClick={() => toggleFlag(currentQuestion._id)}
                  title={flagged.has(currentQuestion._id) ? 'Unflag this question' : 'Flag for review'}
                  className={`flex-shrink-0 p-2 rounded-xl transition-colors ${
                    flagged.has(currentQuestion._id)
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-900/5 dark:bg-white/5 text-slate-500 hover:text-yellow-400'
                  }`}
                >
                  <Flag size={15} fill={flagged.has(currentQuestion._id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt) => {
                  const selected = answers[currentQuestion._id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(currentQuestion._id, opt)}
                      className={`text-left px-4 py-3 rounded-xl text-sm transition-all border ${
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

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} /> Previous
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Review & Submit
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCheatWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="rounded-2xl border border-red-500/30 max-w-sm w-full p-6 text-center"
              style={{ background: '#13131f' }}
            >
              <ShieldAlert size={36} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Suspicious activity detected</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Switching tabs or exiting fullscreen during the quiz is not allowed.
              </p>
              <p className="text-xs text-red-400 mb-5">
                {tabSwitchCount}/{TAB_SWITCH_LIMIT} warnings — your quiz will auto-submit if this continues.
              </p>
              <button
                onClick={() => setShowCheatWarning(false)}
                className="gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity w-full"
              >
                I understand, continue quiz
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => !submitting && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-slate-900/10 dark:border-white/10 max-w-sm w-full p-6"
              style={{ background: '#13131f' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit quiz?</h3>
                <button onClick={() => setShowConfirm(false)} disabled={submitting} className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all">
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                You have answered <span className="text-slate-900 dark:text-white font-medium">{answeredCount}</span> of{' '}
                <span className="text-slate-900 dark:text-white font-medium">{totalQuestions}</span> questions.
              </p>
              {unansweredCount > 0 && (
                <p className="text-sm text-yellow-400 mb-4">
                  {unansweredCount} question{unansweredCount !== 1 ? 's' : ''} left unanswered will be marked incorrect.
                </p>
              )}
              {flagged.size > 0 && (
                <p className="text-xs text-slate-500 mb-4">{flagged.size} question(s) flagged for review.</p>
              )}

              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Keep reviewing
                </button>
                <button
                  onClick={() => doSubmit(null)}
                  disabled={submitting}
                  className="gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
