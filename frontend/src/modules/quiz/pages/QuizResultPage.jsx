import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAttemptDetails, checkQuizEligibility, generateWeakSpotReview } from '../../shared/services/api.service';
import { useAuth } from '../../auth/AuthContext';
import ChatbotWidget from '../../chatbot/components/ChatbotWidget';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, RotateCcw,
  AlertTriangle, Loader2, Info, ShieldAlert, MessageCircle, Sparkles,
} from 'lucide-react';

export default function QuizResultPage() {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const submitResult = location.state?.result;

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showChatbot, setShowChatbot] = useState(false);

  const [retryStatus, setRetryStatus] = useState(null);
  const [checkingRetry, setCheckingRetry] = useState(false);

  const [weakSpots, setWeakSpots] = useState(null);
  const [loadingWeakSpots, setLoadingWeakSpots] = useState(false);

  useEffect(() => {
    const load = async () => {
      const attemptId = submitResult?.attemptId;

      if (!attemptId) {
        setLoadError('No quiz attempt found. Please attempt the quiz again.');
        setLoading(false);
        return;
      }

      try {
        const { data } = await getAttemptDetails(attemptId);
        setAttempt(data.data);
        if (data.data.weakSpotStatus === 'completed' && data.data.weakSpotReview?.length > 0) {
          setWeakSpots(data.data.weakSpotReview);
        }
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Failed to load quiz result');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [submitResult]);

  const handleGetWeakSpots = async () => {
    if (!attempt?._id) return;
    setLoadingWeakSpots(true);
    try {
      const { data } = await generateWeakSpotReview(attempt._id);
      setWeakSpots(data.data.weakSpotReview);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate feedback');
    } finally {
      setLoadingWeakSpots(false);
    }
  };

  const handleTryAgainClick = async () => {
    setCheckingRetry(true);
    try {
      const { data } = await checkQuizEligibility(lectureId);
      setRetryStatus(data.data);
      if (data.data.eligible) {
        navigate(`/quiz/${lectureId}`);
      }
    } catch {
      setRetryStatus({ eligible: false, message: 'Could not check attempt status. Please try again later.' });
    } finally {
      setCheckingRetry(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (loadError || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center border border-slate-900/[0.06] dark:border-white/[0.06] max-w-md">
          <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Couldn't load result</h2>
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

  const {
    score, totalCorrect, totalQuestions, isPassed,
    passingScore, attemptNumber, maxAttempts,
    timeTakenInSeconds, isAutoSubmitted, autoSubmitReason,
    detailedAnswers,
  } = attempt;

  const minutes = Math.floor((timeTakenInSeconds || 0) / 60);
  const seconds = (timeTakenInSeconds || 0) % 60;
  const attemptsLeft = Math.max((maxAttempts || 3) - attemptNumber, 0);

  const autoSubmitLabel = {
    timer_expired: 'Time ran out',
    tab_switch_limit: 'Too many tab switches',
    fullscreen_exit: 'Exited fullscreen',
  }[autoSubmitReason];

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-8 text-center mb-6"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold ${
            isPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {score}%
          </div>

          <h2 className={`text-lg font-semibold mb-1 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPassed ? 'Passed!' : 'Not Passed'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Attempt {attemptNumber} of {maxAttempts || 3} · Passing score: {passingScore}%
          </p>

          {isAutoSubmitted && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full">
              <ShieldAlert size={12} /> Auto-submitted{autoSubmitLabel ? ` — ${autoSubmitLabel}` : ''}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Correct</p>
              <p className="text-lg font-bold text-emerald-400">{totalCorrect}</p>
            </div>
            <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Wrong</p>
              <p className="text-lg font-bold text-red-400">{totalQuestions - totalCorrect}</p>
            </div>
            <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Time taken</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                <Clock size={14} /> {minutes}m {seconds}s
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowChatbot((v) => !v)}
            className="mt-5 inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl
                       bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-primary-500/40 transition-all"
          >
            <MessageCircle size={15} /> {showChatbot ? 'Hide Doubt Assistant' : 'Ask a Doubt'}
          </button>
        </motion.div>

        {totalCorrect < totalQuestions && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
            className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-yellow-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personalized Feedback</h3>
            </div>

            {!weakSpots ? (
              <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get AI-powered suggestions on what to review based on your wrong answers.
                </p>
                <button
                  onClick={handleGetWeakSpots}
                  disabled={loadingWeakSpots}
                  className="flex-shrink-0 flex items-center gap-2 text-sm px-4 py-2 rounded-xl gradient-primary text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loadingWeakSpots ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loadingWeakSpots ? 'Analyzing...' : 'Get Feedback'}
                </button>
              </div>
            ) : (
              <ul className="space-y-2 mt-3">
                {weakSpots.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {showChatbot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 overflow-hidden"
          >
            <ChatbotWidget
              lectureId={lectureId}
              lectureTitle={attempt.quiz?.title?.replace(/^Quiz for /, '') || 'this lecture'}
              currentUser={user}
            />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-5 mb-6 flex items-center justify-between flex-wrap gap-3"
        >
          <div>
            <p className="text-sm text-slate-900 dark:text-white font-medium">
              {attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining` : 'No attempts remaining'}
            </p>
            {retryStatus && !retryStatus.eligible && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1.5">
                <Info size={12} /> {retryStatus.message}
              </p>
            )}
          </div>

          {attemptsLeft > 0 && (
            <button
              onClick={handleTryAgainClick}
              disabled={checkingRetry}
              className="gradient-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
            >
              {checkingRetry ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Try Again
            </button>
          )}
        </motion.div>

        <div className="space-y-3">
          {detailedAnswers.map((item, i) => (
            <motion.div
              key={item.questionId || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className={`glass rounded-2xl border p-5 ${
                item.isCorrect ? 'border-emerald-500/20' : 'border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {item.isCorrect ? (
                  <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{i + 1}. {item.question}</p>
                    {item.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 capitalize">
                        {item.difficulty}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-1">
                    Your answer:{' '}
                    <span className={item.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {item.selectedAnswer || 'Not answered'}
                    </span>
                  </p>

                  {!item.isCorrect && (
                    <p className="text-xs text-slate-500 mb-1">
                      Correct answer: <span className="text-emerald-400">{item.correctAnswer}</span>
                    </p>
                  )}

                  {item.explanation && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 bg-slate-900/5 dark:bg-white/5 rounded-lg p-2.5">
                      {item.explanation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => navigate(-2)}
          className="mt-6 w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Back to Lecture
        </button>
      </div>
    </div>
  );
}
