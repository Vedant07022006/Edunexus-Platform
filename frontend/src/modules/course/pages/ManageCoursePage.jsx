import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCourseById, publishCourse, deleteCourse,
  getInstructorLectures, addLecture, deleteLecture,
  generateTranscript, generateQuiz, generateSummary, deleteTranscript, deleteQuiz,
  createManualQuiz, getAiQuota, getQuizByLecture, updateManualQuiz,
} from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import CouponPanel from '../../lecture/components/CouponPanel';
import PaymentsPanel from '../../lecture/components/PaymentPanel';
import {
  BookOpen, Upload, Trash2, Plus, Eye, EyeOff,
  Brain, FileText, ArrowLeft, Film, CheckCircle2,
  AlertCircle, Loader2, Video, RefreshCw, Lock,
  X, AlertTriangle, PencilLine, Zap, CircleSlash,
  Sparkles, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  pending:          'text-slate-600 dark:text-slate-400',
  transcribing:     'text-yellow-400',
  generating_quiz:  'text-blue-400',
  completed:        'text-emerald-400',
  failed:           'text-red-400',
};
const STATUS_LABEL = {
  pending:          '⏳ Ready to process',
  transcribing:     '🔄 Transcribing...',
  generating_quiz:  '🧠 Transcript done — generate quiz',
  completed:        '✅ Complete',
  failed:           '❌ Failed',
};

const TOTAL_QUESTIONS = 20;
const EASY_TARGET   = 5;
const MEDIUM_TARGET = 10;
const HARD_TARGET   = 5;

const emptyQuestion = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  difficulty: 'easy',
});

function ManualQuizModal({ lectureId, lectureTitle, onClose, onSaved, initialQuestions = null }) {
  const isEditMode = !!initialQuestions;

  const [questions, setQuestions] = useState(() => {
    if (initialQuestions && initialQuestions.length === TOTAL_QUESTIONS) {
      return initialQuestions.map((q) => ({
        questionText: q.questionText || '',
        options: Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : ['', '', '', ''],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'easy',
      }));
    }
    return Array.from({ length: TOTAL_QUESTIONS }, emptyQuestion);
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const counts = questions.reduce(
    (acc, q) => {
      if (q.questionText.trim() && q.correctAnswer) acc[q.difficulty]++;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 }
  );

  const filledCount = questions.filter(
    (q) => q.questionText.trim() && q.options.every((o) => o.trim()) && q.correctAnswer
  ).length;

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (index, optIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const newOptions = [...q.options];
        const oldValue = newOptions[optIndex];
        newOptions[optIndex] = value;
        const correctAnswer = q.correctAnswer === oldValue ? value : q.correctAnswer;
        return { ...q, options: newOptions, correctAnswer };
      })
    );
  };

  const isComplete =
    filledCount === TOTAL_QUESTIONS &&
    counts.easy === EASY_TARGET &&
    counts.medium === MEDIUM_TARGET &&
    counts.hard === HARD_TARGET;

  const handleSave = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return toast.error(`Question ${i + 1}: text is required`);
      if (q.options.some((o) => !o.trim())) return toast.error(`Question ${i + 1}: all 4 options are required`);
      if (!q.correctAnswer) return toast.error(`Question ${i + 1}: select the correct answer`);
    }

    if (counts.easy !== EASY_TARGET || counts.medium !== MEDIUM_TARGET || counts.hard !== HARD_TARGET) {
      return toast.error(
        `Need exactly ${EASY_TARGET} easy, ${MEDIUM_TARGET} medium, ${HARD_TARGET} hard (currently ${counts.easy}/${counts.medium}/${counts.hard})`
      );
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await updateManualQuiz(lectureId, { questions, title: `Quiz for ${lectureTitle}` });
        toast.success('Quiz updated! ✅');
      } else {
        await createManualQuiz(lectureId, { questions, title: `Quiz for ${lectureTitle}` });
        toast.success('Quiz created manually! ✅');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const current = questions[activeIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="rounded-2xl border border-slate-900/10 dark:border-white/10 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ background: '#13131f' }}
      >
        <div className="p-5 border-b border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Quiz' : 'Create Quiz Manually'}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{lectureTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-900/[0.06] dark:border-white/[0.06] flex-shrink-0 bg-slate-900/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-600 dark:text-slate-400">{filledCount}/{TOTAL_QUESTIONS} questions filled</span>
            <div className="flex gap-3">
              <span className={counts.easy === EASY_TARGET ? 'text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                Easy: {counts.easy}/{EASY_TARGET} {counts.easy === EASY_TARGET && '✅'}
              </span>
              <span className={counts.medium === MEDIUM_TARGET ? 'text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                Medium: {counts.medium}/{MEDIUM_TARGET} {counts.medium === MEDIUM_TARGET && '✅'}
              </span>
              <span className={counts.hard === HARD_TARGET ? 'text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                Hard: {counts.hard}/{HARD_TARGET} {counts.hard === HARD_TARGET && '✅'}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-300"
              style={{ width: `${(filledCount / TOTAL_QUESTIONS) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-40 border-r border-slate-900/[0.06] dark:border-white/[0.06] p-3 overflow-y-auto flex-shrink-0">
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => {
                const isFilled = q.questionText.trim() && q.options.every((o) => o.trim()) && q.correctAnswer;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      activeIndex === i
                        ? 'gradient-primary text-white'
                        : isFilled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-900/5 dark:bg-white/5 text-slate-500 border border-slate-900/10 dark:border-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Question {activeIndex + 1}</p>
              <select
                value={current.difficulty}
                onChange={(e) => updateQuestion(activeIndex, 'difficulty', e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300"
                style={{ background: '#1a1d2e' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <textarea
              value={current.questionText}
              onChange={(e) => updateQuestion(activeIndex, 'questionText', e.target.value)}
              placeholder="Enter question text..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${activeIndex}`}
                    checked={current.correctAnswer === opt && opt.trim() !== ''}
                    onChange={() => updateQuestion(activeIndex, 'correctAnswer', opt)}
                    disabled={!opt.trim()}
                    className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(activeIndex, i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Select the radio button next to the correct option</p>

            <textarea
              value={current.explanation}
              onChange={(e) => updateQuestion(activeIndex, 'explanation', e.target.value)}
              placeholder="Short explanation for the correct answer..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 resize-none"
            />

            <div className="flex justify-between pt-2">
              <Button
                variant="secondary" size="sm"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary" size="sm"
                disabled={activeIndex === TOTAL_QUESTIONS - 1}
                onClick={() => setActiveIndex((i) => Math.min(TOTAL_QUESTIONS - 1, i + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            {isComplete ? '✅ All questions complete — ready to save' : 'Fill all 20 questions to save'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!isComplete || saving} loading={saving} onClick={handleSave}>
              Save Quiz
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteCourseModal({ course, onClose, onConfirm, deleting }) {
  const hasStudents = (course.totalEnrollments || 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-slate-900/10 dark:border-white/10 w-full max-w-md p-6 shadow-2xl"
        style={{ background: '#13131f' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete this course?</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{course.title}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-5">
          <p>This course will be removed from listings and search, and you won't be able to add new lectures to it.</p>
          {hasStudents ? (
            <p className="text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs">
              {course.totalEnrollments} enrolled student{course.totalEnrollments !== 1 ? 's' : ''} will keep full access to all
              lectures and quizzes. They will see a notice that this course has been discontinued.
            </p>
          ) : (
            <p className="text-slate-500 text-xs">This course currently has no enrolled students.</p>
          )}
          <p className="text-xs text-slate-500">
            This is reversible — you can restore the course anytime from your dashboard's Archived Courses section.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={onConfirm}
          >
            <Trash2 size={13} /> Delete Course
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ManageCoursePage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [course, setCourse]       = useState(null);
  const [lectures, setLectures]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');

  const [addingLecture, setAddingLecture]       = useState(false);
  const [lectureForm, setLectureForm]           = useState({ title: '', order: '', isFree: false, releaseDate: '' });
  const [videoFile, setVideoFile]               = useState(null);
  const [uploadingLecture, setUploadingLecture] = useState(false);
  const [uploadProgress, setUploadProgress]     = useState(0);

  const [actionState, setActionState] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse]    = useState(false);

  const [aiQuota, setAiQuota] = useState(null);

  const [manualQuizLecture, setManualQuizLecture] = useState(null);
  const [editQuizLecture, setEditQuizLecture]     = useState(null);
  const [loadingEditQuiz, setLoadingEditQuiz]     = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cRes, lRes, qRes] = await Promise.all([
        getCourseById(courseId),
        getInstructorLectures(courseId),
        getAiQuota(courseId).catch(() => null),
      ]);
      setCourse(cRes.data.data);
      setLectures((lRes.data.data.lectures || []).sort((a, b) => a.order - b.order));
      if (qRes) setAiQuota(qRes.data.data);
      setLoadError('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load course';
      setLoadError(msg);
    }
  }, [courseId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handlePublishToggle = async () => {
    try {
      const { data } = await publishCourse(courseId);
      setCourse(p => ({ ...p, isPublished: data.data.isPublished }));
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed');
    }
  };

  const handleDeleteCourse = async () => {
    setDeletingCourse(true);
    try {
      await deleteCourse(courseId);
      toast.success('Course deleted. Enrolled students keep access; you can restore it anytime.');
      navigate('/instructor');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeletingCourse(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddLecture = async (e) => {
    e.preventDefault();
    if (!lectureForm.title.trim()) return toast.error('Title required');
    if (!lectureForm.order)        return toast.error('Order required');
    if (!videoFile)                return toast.error('Select a video');

    setUploadingLecture(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(p => p >= 90 ? (clearInterval(interval), 90) : p + Math.random() * 7);
    }, 800);

    try {
      const fd = new FormData();
      fd.append('title',  lectureForm.title.trim());
      fd.append('order',  lectureForm.order);
      fd.append('isFree', lectureForm.isFree);
      if (lectureForm.releaseDate) fd.append('releaseDate', lectureForm.releaseDate);
      fd.append('video',  videoFile);

      const { data } = await addLecture(courseId, fd);
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setLectures(p => [...p, data.data].sort((a, b) => a.order - b.order));
        setLectureForm({ title: '', order: '', isFree: false, releaseDate: '' });
        setVideoFile(null);
        setAddingLecture(false);
        setUploadProgress(0);
        toast.success('Lecture uploaded! Generate its transcript next 🎙️');
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setUploadProgress(0);
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setTimeout(() => setUploadingLecture(false), 600);
    }
  };

  const handleTranscript = async (lectureId) => {
    setActionState(p => ({ ...p, [lectureId]: 'transcribing' }));
    setLectures(p => p.map(l =>
      l._id === lectureId ? { ...l, processingStatus: 'transcribing' } : l
    ));

    const tid = toast.loading('Generating transcript... this may take 1-3 minutes');
    try {
      await generateTranscript(lectureId);
      toast.dismiss(tid);
      toast.success('Transcript done! Generate quiz next 🧠');
      await loadData();
    } catch (err) {
      toast.dismiss(tid);
      const msg = err.response?.data?.message || err.message || 'Transcript failed';
      toast.error(msg);
      setLectures(p => p.map(l =>
        l._id === lectureId ? { ...l, processingStatus: 'failed' } : l
      ));
    } finally {
      setActionState(p => ({ ...p, [lectureId]: null }));
    }
  };

  const handleSummary = async (lectureId) => {
    setActionState(p => ({ ...p, [`s_${lectureId}`]: 'summarizing' }));

    const tid = toast.loading('Generating key takeaways with AI...');
    try {
      await generateSummary(lectureId);
      toast.dismiss(tid);
      toast.success('Summary generated ✨');
      await loadData();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.response?.data?.message || 'Summary generation failed');
    } finally {
      setActionState(p => ({ ...p, [`s_${lectureId}`]: null }));
    }
  };

  const handleQuiz = async (lectureId) => {
    if (aiQuota && aiQuota.remaining <= 0) {
      toast.error('Daily AI quiz limit reached for this course. Add the quiz manually instead.');
      return;
    }

    setActionState(p => ({ ...p, [`q_${lectureId}`]: 'quizzing' }));

    const tid = toast.loading('Generating quiz with AI... (20 questions)');
    try {
      const { data } = await generateQuiz(lectureId, {});
      toast.dismiss(tid);
      toast.success('Quiz generated! ✅');
      if (data?.data?.aiQuota) setAiQuota(data.data.aiQuota);
      await loadData();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.response?.data?.message || 'Quiz generation failed');
      if (err.response?.status === 429) await loadData();
    } finally {
      setActionState(p => ({ ...p, [`q_${lectureId}`]: null }));
    }
  };

  const handleOpenEditQuiz = async (lec) => {
    setLoadingEditQuiz(true);
    try {
      const { data } = await getQuizByLecture(lec._id);
      setEditQuizLecture({ lecture: lec, questions: data.data.questions });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load quiz for editing');
    } finally {
      setLoadingEditQuiz(false);
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Delete this lecture permanently?')) return;

    const tid = toast.loading('Deleting lecture...');
    try {
      await deleteLecture(lectureId);
      toast.dismiss(tid);
      setLectures(p => p.filter(l => l._id !== lectureId));
      toast.success('Lecture deleted');
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading course...</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/instructor')} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="glass rounded-2xl p-12 text-center border border-red-500/20">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load course</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="secondary" onClick={() => navigate('/instructor')}>Dashboard</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <button
          onClick={() => navigate('/instructor')}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        {course && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06] mb-6"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      course.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-900/5 dark:bg-white/5 px-2 py-0.5 rounded-full">{course.category}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{course.title}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Film size={13} className="text-primary-400" />{lectures.length} lecture{lectures.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-primary-400" />{course.totalEnrollments || 0} enrolled</span>
                    <span className="text-slate-500">{course.isFree ? 'Free' : `₹${course.price}`}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/instructor/courses/${courseId}/analytics`)} title="View analytics">
                    <BarChart3 size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={loadData} title="Refresh lectures">
                    <RefreshCw size={14} />
                  </Button>
                  <Button
                    variant="secondary" size="md"
                    onClick={() => navigate(`/learn/${courseId}`)}
                    title="Preview your course lectures"
                  >
                    <Eye size={15} /> Preview
                  </Button>
                  <Button
                    variant={course.isPublished ? 'secondary' : 'primary'} size="md"
                    onClick={handlePublishToggle}
                  >
                    {course.isPublished ? <><EyeOff size={15} /> Unpublish</> : <><Eye size={15} /> Publish</>}
                  </Button>
                  <Button
                    variant="danger" size="md"
                    onClick={() => setShowDeleteModal(true)}
                    title="Delete this course"
                  >
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              </div>

              {!course.isPublished && lectures.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  Add at least one lecture before publishing.
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
              className="mb-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="text-xs text-primary-300 font-medium">🤖 AI Content Pipeline</p>
                {aiQuota && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                    aiQuota.remaining > 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {aiQuota.remaining > 0 ? <Zap size={11} /> : <CircleSlash size={11} />}
                    {aiQuota.used}/{aiQuota.limit} AI quizzes used today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Upload size={11} /> Upload</span>
                <span className="text-slate-600">→</span>
                <span className="flex items-center gap-1"><FileText size={11} /> Transcript</span>
                <span className="text-slate-600">→</span>
                <span className="flex items-center gap-1"><Brain size={11} /> Quiz (20 Q: 5 easy / 10 medium / 5 hard)</span>
                <span className="text-slate-600">→</span>
                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={11} /> Done</span>
              </div>
              {aiQuota && aiQuota.remaining <= 0 && (
                <p className="mt-2 text-xs text-yellow-300 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Daily AI limit reached for this course. Use "Add Manually" on any lecture, or wait 24h.
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Film size={16} className="text-primary-400" />
                  Lectures <span className="text-xs text-slate-500 font-normal ml-1">({lectures.length})</span>
                </h2>
                <Button size="sm" onClick={() => setAddingLecture(v => !v)} variant={addingLecture ? 'secondary' : 'primary'}>
                  <Plus size={14} /> {addingLecture ? 'Cancel' : 'Add Lecture'}
                </Button>
              </div>

              <AnimatePresence>
                {addingLecture && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="border-b border-slate-900/[0.06] dark:border-white/[0.06] bg-primary-500/5 overflow-hidden"
                  >
                    <form onSubmit={handleAddLecture} className="p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">New Lecture</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Title *" placeholder="e.g. Introduction to React" value={lectureForm.title}
                          onChange={e => setLectureForm(p => ({ ...p, title: e.target.value }))} required />
                        <Input label="Order *" type="number" min="1" placeholder="1" value={lectureForm.order}
                          onChange={e => setLectureForm(p => ({ ...p, order: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Video * <span className="text-slate-500 text-xs">(MP4/WebM/MKV — max 500MB)</span>
                        </label>
                        <label className={`flex items-center gap-3 px-4 py-3.5 glass border rounded-xl cursor-pointer transition-all text-sm ${
                          videoFile ? 'border-primary-500/60 text-primary-300 bg-primary-500/10'
                                    : 'border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-primary-500/50'
                        }`}>
                          <Video size={16} />
                          <span className="truncate">{videoFile ? videoFile.name : 'Choose video...'}</span>
                          {videoFile && <span className="ml-auto text-xs text-slate-500">{(videoFile.size / 1048576).toFixed(1)} MB</span>}
                          <input type="file" accept="video/*" className="hidden"
                            onChange={e => setVideoFile(e.target.files[0] || null)} />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={lectureForm.isFree}
                          onChange={e => setLectureForm(p => ({ ...p, isFree: e.target.checked }))}
                          className="w-4 h-4 accent-primary-500 rounded" />
                        Free preview
                      </label>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Release date (optional — drip content)</label>
                        <input type="date" value={lectureForm.releaseDate}
                          onChange={e => setLectureForm(p => ({ ...p, releaseDate: e.target.value }))}
                          className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-all" />
                      </div>
                      {uploadingLecture && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Uploading... may take 1-2 min</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="h-2 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div className="h-full gradient-primary rounded-full"
                              animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.4 }} />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button type="submit" loading={uploadingLecture} disabled={uploadingLecture}>
                          {uploadingLecture ? 'Uploading...' : <><Upload size={15} /> Upload</>}
                        </Button>
                        <Button type="button" variant="ghost" disabled={uploadingLecture}
                          onClick={() => { setAddingLecture(false); setVideoFile(null); setUploadProgress(0); }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 space-y-2">
                {lectures.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Film size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No lectures yet</p>
                    <p className="text-xs mt-1">Click "Add Lecture" to upload your first video.</p>
                  </div>
                ) : lectures.map((lec) => {
                  const busy = actionState[lec._id] === 'transcribing';
                  const quizBusy = actionState[`q_${lec._id}`] === 'quizzing';
                  const hasTranscript = ['generating_quiz', 'completed'].includes(lec.processingStatus);
                  const isComplete = lec.processingStatus === 'completed';
                  const aiLimitReached = aiQuota && aiQuota.remaining <= 0;

                  return (
                    <motion.div key={lec._id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="glass rounded-xl p-4 border border-slate-900/[0.06] dark:border-white/[0.06] hover:border-slate-900/10 dark:hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {lec.order}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{lec.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs font-medium ${STATUS_COLOR[lec.processingStatus] || 'text-slate-600 dark:text-slate-400'}`}>
                                {STATUS_LABEL[lec.processingStatus] || lec.processingStatus}
                              </span>
                              <span className="text-slate-600 text-xs">·</span>
                              <span className="text-xs text-slate-500">{lec.isFree ? '🆓 Free' : '🔒 Paid'}</span>
                              {lec.video?.duration > 0 && (
                                <><span className="text-slate-600 text-xs">·</span>
                                <span className="text-xs text-slate-500">{Math.floor(lec.video.duration / 60)}m {Math.round(lec.video.duration % 60)}s</span></>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => !busy && !hasTranscript && handleTranscript(lec._id)}
                            disabled={busy || hasTranscript}
                            title={hasTranscript ? 'Transcript done' : 'Generate Transcript (Step 1)'}
                            className={`flex items-center gap-1 px-2.5 py-1.5 glass rounded-lg text-xs font-medium transition-all border ${
                              hasTranscript
                                ? 'text-emerald-400 border-emerald-500/20 cursor-default opacity-70'
                                : 'text-slate-700 dark:text-slate-300 hover:text-primary-400 border-slate-900/10 dark:border-white/10 hover:border-primary-500/40 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                          >
                            {busy ? <Loader2 size={12} className="animate-spin" />
                              : hasTranscript ? <CheckCircle2 size={12} />
                              : <FileText size={12} />}
                            {busy ? 'Working...' : 'Transcript'}
                          </button>

                          {(() => {
                            const summaryBusy = actionState[`s_${lec._id}`] === 'summarizing';
                            const summaryDone = lec.summaryStatus === 'completed';
                            return (
                              <button
                                onClick={() => hasTranscript && !summaryDone && !summaryBusy && handleSummary(lec._id)}
                                disabled={!hasTranscript || summaryDone || summaryBusy}
                                title={
                                  !hasTranscript ? 'Generate transcript first'
                                  : summaryDone ? 'Summary generated'
                                  : 'Generate key-takeaway summary with AI'
                                }
                                className={`flex items-center gap-1 px-2.5 py-1.5 glass rounded-lg text-xs font-medium transition-all border ${
                                  !hasTranscript
                                    ? 'text-slate-600 border-slate-900/5 dark:border-white/5 cursor-not-allowed opacity-40'
                                    : summaryDone
                                      ? 'text-emerald-400 border-emerald-500/20 cursor-default opacity-70'
                                      : 'text-slate-700 dark:text-slate-300 hover:text-yellow-400 border-slate-900/10 dark:border-white/10 hover:border-yellow-500/40 disabled:opacity-40 disabled:cursor-not-allowed'
                                }`}
                              >
                                {summaryBusy ? <Loader2 size={12} className="animate-spin" />
                                  : !hasTranscript ? <Lock size={12} />
                                  : summaryDone ? <CheckCircle2 size={12} />
                                  : <Sparkles size={12} />}
                                {summaryBusy ? 'Working...' : 'Summary'}
                              </button>
                            );
                          })()}

                          <button
                            onClick={() => hasTranscript && !isComplete && !quizBusy && !aiLimitReached && handleQuiz(lec._id)}
                            disabled={!hasTranscript || isComplete || quizBusy || aiLimitReached}
                            title={
                              !hasTranscript ? 'Generate transcript first'
                              : isComplete ? 'Quiz done'
                              : aiLimitReached ? 'Daily AI limit reached — add manually instead'
                              : 'Generate Quiz with AI (Step 2)'
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 glass rounded-lg text-xs font-medium transition-all border ${
                              !hasTranscript
                                ? 'text-slate-600 border-slate-900/5 dark:border-white/5 cursor-not-allowed opacity-40'
                                : isComplete
                                  ? 'text-emerald-400 border-emerald-500/20 cursor-default opacity-70'
                                  : aiLimitReached
                                    ? 'text-slate-600 border-slate-900/5 dark:border-white/5 cursor-not-allowed opacity-40'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-purple-400 border-slate-900/10 dark:border-white/10 hover:border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                          >
                            {quizBusy ? <Loader2 size={12} className="animate-spin" />
                              : !hasTranscript ? <Lock size={12} />
                              : isComplete ? <CheckCircle2 size={12} />
                              : aiLimitReached ? <CircleSlash size={12} />
                              : <Brain size={12} />}
                            {quizBusy ? 'Working...' : 'AI Quiz'}
                          </button>

                          {!isComplete && (
                            <button
                              onClick={() => setManualQuizLecture(lec)}
                              title="Create quiz manually (20 questions)"
                              className="flex items-center gap-1 px-2.5 py-1.5 glass rounded-lg text-xs font-medium transition-all border text-slate-700 dark:text-slate-300 hover:text-blue-400 border-slate-900/10 dark:border-white/10 hover:border-blue-500/40"
                            >
                              <PencilLine size={12} /> Add Manually
                            </button>
                          )}

                          {isComplete && (
                            <button
                              onClick={() => handleOpenEditQuiz(lec)}
                              disabled={loadingEditQuiz}
                              title="Edit existing quiz questions"
                              className="flex items-center gap-1 px-2.5 py-1.5 glass rounded-lg text-xs font-medium transition-all border text-slate-700 dark:text-slate-300 hover:text-yellow-400 border-slate-900/10 dark:border-white/10 hover:border-yellow-500/40 disabled:opacity-50"
                            >
                              {loadingEditQuiz ? <Loader2 size={12} className="animate-spin" /> : <PencilLine size={12} />}
                              Edit Quiz
                            </button>
                          )}

                          {lec.processingStatus === 'failed' && (
                            <button onClick={() => handleTranscript(lec._id)} title="Retry"
                              className="p-1.5 glass rounded-lg text-red-400 hover:text-orange-400 border border-red-500/20 transition-all text-xs">
                              <RefreshCw size={12} />
                            </button>
                          )}

                          <button onClick={() => handleDeleteLecture(lec._id)} title="Delete"
                            className="p-1.5 glass rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-400 border border-slate-900/5 dark:border-white/5 hover:border-red-500/20 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <CouponPanel courseId={courseId} />
            <PaymentsPanel courseId={courseId} />
          </>
        )}
      </div>

      <AnimatePresence>
        {showDeleteModal && course && (
          <DeleteCourseModal
            course={course}
            deleting={deletingCourse}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteCourse}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manualQuizLecture && (
          <ManualQuizModal
            lectureId={manualQuizLecture._id}
            lectureTitle={manualQuizLecture.title}
            onClose={() => setManualQuizLecture(null)}
            onSaved={loadData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editQuizLecture && (
          <ManualQuizModal
            lectureId={editQuizLecture.lecture._id}
            lectureTitle={editQuizLecture.lecture.title}
            initialQuestions={editQuizLecture.questions}
            onClose={() => setEditQuizLecture(null)}
            onSaved={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
