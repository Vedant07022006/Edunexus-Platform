import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getCourseLectures, updateProgress, checkEnrollment, checkQuizEligibility } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Lock, BookOpen, Clock, ShieldCheck, Archive, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import QuizSection from '../quiz/QuizSection';

const LS_KEY = (courseId) => `edunexus_last_lecture_${courseId}`;

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export default function LecturePlayer({ courseId }) {
  const { user } = useAuth();

  const [lecturesData, setLecturesData]   = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [completedIds, setCompletedIds]   = useState([]);
  const [activeTab, setActiveTab]         = useState('overview');
  const [loading, setLoading]             = useState(true);
  const [videoError, setVideoError]       = useState(false);
  const [quizStatus, setQuizStatus]       = useState(null);

  const markedRef = useRef(new Set());
  const videoRef  = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getCourseLectures(courseId);
        const ld = data.data;
        setLecturesData(ld);

        const lectures = ld?.lectures || [];
        if (lectures.length === 0) return;

        let resumeId = null;

        if (user && ld.isEnrolled) {
          try {
            const { data: enData } = await checkEnrollment(courseId);
            const lastId =
              enData?.data?.enrollment?.lastWatchedLecture?._id ||
              enData?.data?.enrollment?.lastWatchedLecture;
            if (lastId) resumeId = lastId.toString();

            const completed = enData?.data?.enrollment?.completedLectures || [];
            setCompletedIds(completed.map((id) => id.toString()));
          } catch {
            // fall through to localStorage
          }
        }

        if (!resumeId) resumeId = localStorage.getItem(LS_KEY(courseId));

        const resumeLecture = resumeId
          ? lectures.find((l) => l._id.toString() === resumeId)
          : null;

        setActiveLecture(resumeLecture || lectures[0]);
      } catch {
        toast.error('Failed to load lectures');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, user]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLecture) return;
    const played = video.currentTime / video.duration;
    if (played > 0.8 && !markedRef.current.has(activeLecture._id)) {
      markedRef.current.add(activeLecture._id);
      updateProgress(courseId, { lectureId: activeLecture._id })
        .then(() =>
          setCompletedIds((prev) => [...new Set([...prev, activeLecture._id])])
        )
        .catch(() => {});
    }
  }, [activeLecture, courseId]);

  // Check quiz eligibility whenever the active lecture changes.
  // NOTE: uses lecturesData?.isInstructor (not the bare isInstructor variable,
  // which is only declared later after the loading guard below) to avoid a
  // "Cannot access before initialization" ReferenceError.
  useEffect(() => {
    if (!activeLecture || !user) return;
    if (lecturesData?.isInstructor) return; // instructors always have full access

    setQuizStatus(null);
    checkQuizEligibility(activeLecture._id)
      .then(({ data }) => setQuizStatus(data.data))
      .catch(() => setQuizStatus(null));
  }, [activeLecture?._id, user, lecturesData?.isInstructor]);

  const switchLecture = (lecture) => {
    setActiveLecture(lecture);
    setActiveTab('overview');
    setVideoError(false);
    setQuizStatus(null);
    localStorage.setItem(LS_KEY(courseId), lecture._id);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const lectures     = lecturesData?.lectures || [];
  const isEnrolled   = lecturesData?.isEnrolled;
  const isInstructor = lecturesData?.isInstructor;
  const isArchived   = lecturesData?.isArchived;

  const progress = isEnrolled
    ? Math.round((completedIds.length / Math.max(lectures.length, 1)) * 100)
    : 0;

  // Instructor gets full video access to their own course
  const hasFullAccess = isInstructor || isEnrolled || lecturesData?.isFree || activeLecture?.isFree;
  const videoUrl      = hasFullAccess ? activeLecture?.video?.url : null;
  const hasVideo      = !!videoUrl;

  const TABS = [
    { id: 'overview', label: '📋 Overview' },
    { id: 'quiz',     label: '🧠 Quiz' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">

      {/* Player Area */}
      <div className="flex-1 min-w-0">

        {/* Course Owner badge — only visible to instructor */}
        {isInstructor && (
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium
                          bg-yellow-500/10 border border-yellow-500/20 text-yellow-400
                          px-3 py-1.5 rounded-full">
            <ShieldCheck size={13} />
            Course Owner — Preview Mode
          </div>
        )}

        {/* Discontinued badge — shown to enrolled students when instructor has deleted the course */}
        {!isInstructor && isArchived && (
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium
                          bg-slate-500/10 border border-slate-500/20 text-slate-400
                          px-3 py-1.5 rounded-full">
            <Archive size={13} />
            This course has been discontinued by the instructor — you keep full access
          </div>
        )}

        {/* Video */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video">
          {hasVideo && !videoError ? (
            <video
              ref={videoRef}
              key={activeLecture._id}
              src={videoUrl}
              controls
              controlsList="nodownload"
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onError={() => setVideoError(true)}
              preload="metadata"
            />
          ) : hasVideo && videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-3 text-slate-400 p-6 text-center">
              <BookOpen size={40} className="opacity-40" />
              <p className="text-sm">Unable to play video inline.</p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="gradient-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Open Video in New Tab
              </a>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-surface-3 text-slate-500">
              <Lock size={40} />
              <p className="text-sm font-medium">Purchase the course to access this lecture</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 glass rounded-xl p-1 w-fit">
          {TABS.map((tab) => {
            const isQuizTab  = tab.id === 'quiz';
            const quizLocked = isQuizTab && !isInstructor && quizStatus && !quizStatus.eligible;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (quizLocked) return;
                  setActiveTab(tab.id);
                }}
                title={quizLocked ? quizStatus?.message : ''}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : quizLocked
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'text-slate-400 hover:text-white cursor-pointer'
                }`}
              >
                {isQuizTab && quizLocked && <Lock size={11} />}
                {tab.label}
                {isQuizTab && quizStatus?.eligible && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {quizStatus.attemptsLeft} left
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quiz lock reason shown below tabs */}
        {!isInstructor && quizStatus && !quizStatus.eligible && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <AlertCircle
              size={12}
              className={
                quizStatus.reason === 'video_not_completed'
                  ? 'text-yellow-500'
                  : 'text-slate-500'
              }
            />
            <span className={
              quizStatus.reason === 'video_not_completed'
                ? 'text-yellow-400'
                : 'text-slate-500'
            }>
              {quizStatus.message}
            </span>
          </div>
        )}

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && activeLecture && (
            <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-3">
              <h2 className="text-xl font-bold text-white">{activeLecture.title}</h2>

              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                {activeLecture.video?.duration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-primary-400" />
                    {formatDuration(activeLecture.video.duration)}
                  </span>
                )}

                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  lecturesData?.isFree || activeLecture.isFree
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 text-slate-400'
                }`}>
                  {lecturesData?.isFree ? 'Free' : activeLecture.isFree ? 'Free preview' : 'Paid'}
                </span>

                {completedIds.includes(activeLecture._id) && (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs">
                    <CheckCircle size={13} /> Completed
                  </span>
                )}
              </div>

              {activeLecture.description ? (
                <p className="text-sm text-slate-400 leading-relaxed">{activeLecture.description}</p>
              ) : (
                <p className="text-sm text-slate-500 italic">No description for this lecture.</p>
              )}
            </div>
          )}

          {activeTab === 'quiz' && activeLecture && (isInstructor || quizStatus?.eligible) && (
            <QuizSection lectureId={activeLecture._id} />
          )}
        </div>
      </div>

      {/* Sidebar — Lecture List */}
      <div className="w-full lg:w-80 glass rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-white text-sm">Course Content</h3>
          <p className="text-xs text-slate-500 mt-0.5">{lectures.length} lectures</p>

          {/* Progress bar — only for students */}
          {!isInstructor && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Instructor label instead of progress */}
          {isInstructor && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-yellow-400">
              <ShieldCheck size={11} />
              Viewing as course owner
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {lectures.map((lecture, i) => {
            const isActive = activeLecture?._id === lecture._id;
            const isDone   = completedIds.includes(lecture._id);
            // Instructor is never locked
            const isLocked = !isInstructor && !isEnrolled && !lecturesData?.isFree && !lecture.isFree;

            return (
              <button
                key={lecture._id}
                onClick={() => !isLocked && switchLecture(lecture)}
                className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                  isActive
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'hover:bg-white/5'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                      ? 'bg-primary-500/30 text-primary-400'
                      : 'bg-white/5 text-slate-500'
                  }`}>
                    {isLocked ? <Lock size={10} /> : isDone ? <CheckCircle size={12} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${
                      isActive ? 'text-primary-300' : isDone ? 'text-slate-400' : 'text-slate-300'
                    }`}>
                      {lecture.title}
                    </p>
                    {lecture.video?.duration > 0 && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDuration(lecture.video.duration)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
