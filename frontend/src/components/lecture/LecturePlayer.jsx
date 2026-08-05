import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCourseLectures, updateProgress, updateLastWatchedPosition, checkEnrollment, checkQuizEligibility } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Lock, BookOpen, Clock, ShieldCheck, Archive, AlertCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import TranscriptPanel from './TranscriptPanel'; // NEW
import LectureSummary from './LectureSummary'; // NEW — Phase 2
import DiscussionPanel from './DiscussionPanel'; // NEW — Phase 3

const LS_KEY = (courseId) => `edunexus_last_lecture_${courseId}`;

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export default function LecturePlayer({ courseId }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [lecturesData, setLecturesData]   = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [completedIds, setCompletedIds]   = useState([]);
  const [activeTab, setActiveTab]         = useState('overview');
  const [loading, setLoading]             = useState(true);
  const [videoError, setVideoError]       = useState(false);
  const [quizStatus, setQuizStatus]       = useState(null);

  const markedRef = useRef(new Set());
  const videoRef  = useRef(null);

  // NEW — resume-from-exact-position tracking
  const resumeLectureIdRef = useRef(null); // which lecture id we should seek into on first load
  const resumeSecondsRef   = useRef(0);    // seconds to seek to for that lecture
  const lastPositionSaveRef = useRef(0);   // Date.now() of last position heartbeat (throttling)

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

            // NEW — remember exact playback position for resume-seek
            resumeSecondsRef.current = enData?.data?.enrollment?.lastWatchedSeconds || 0;

            const completed = enData?.data?.enrollment?.completedLectures || [];
            setCompletedIds(completed.map((id) => id.toString()));
          } catch {
            // fall through to localStorage
          }
        }

        if (!resumeId) resumeId = localStorage.getItem(LS_KEY(courseId));
        resumeLectureIdRef.current = resumeId; // NEW

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

  const markLectureCompleted = useCallback(() => {
    if (!activeLecture || markedRef.current.has(activeLecture._id)) return;
    markedRef.current.add(activeLecture._id);
    updateProgress(courseId, { lectureId: activeLecture._id })
      .then(() => {
        setCompletedIds((prev) => [...new Set([...prev, activeLecture._id])]);
        // Re-check quiz eligibility to immediately unlock the Quiz tab for student
        if (user && !lecturesData?.isInstructor) {
          checkQuizEligibility(activeLecture._id)
            .then(({ data }) => setQuizStatus(data.data))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [activeLecture, courseId, user, lecturesData?.isInstructor]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLecture) return;
    const played = video.currentTime / video.duration;
    if (played > 0.8) {
      markLectureCompleted();
    }

    // NEW — lightweight playback-position heartbeat, throttled to once per
    // ~10s of real time so we don't hammer the API on every timeupdate tick.
    const now = Date.now();
    if (now - lastPositionSaveRef.current > 10000) {
      lastPositionSaveRef.current = now;
      updateLastWatchedPosition(courseId, {
        lectureId: activeLecture._id,
        seconds: Math.floor(video.currentTime),
      }).catch(() => {});
    }
  }, [activeLecture, courseId, markLectureCompleted]);

  const handleEnded = useCallback(() => {
    markLectureCompleted();
  }, [markLectureCompleted]);

  // NEW — once the video's metadata is loaded, seek to the saved resume
  // position if this is the lecture the student was last watching.
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLecture) return;

    if (
      resumeLectureIdRef.current &&
      activeLecture._id.toString() === resumeLectureIdRef.current &&
      resumeSecondsRef.current > 2 &&
      resumeSecondsRef.current < video.duration - 2
    ) {
      video.currentTime = resumeSecondsRef.current;
    }

    // Only apply the resume-seek once — subsequent replays of the same
    // lecture in this session should start from wherever the user seeks.
    resumeLectureIdRef.current = null;
  }, [activeLecture]);

  // NEW — save position immediately when the student pauses, instead of
  // waiting for the next 10s heartbeat.
  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLecture) return;
    updateLastWatchedPosition(courseId, {
      lectureId: activeLecture._id,
      seconds: Math.floor(video.currentTime),
    }).catch(() => {});
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
    { id: 'overview',   label: '📋 Overview' },
    { id: 'transcript', label: '📝 Transcript' }, // NEW
    { id: 'discussion', label: '💬 Discussion' }, // NEW — Phase 3
    { id: 'quiz',       label: '🧠 Quiz' },
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
                          bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400
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
              onEnded={handleEnded}
              onLoadedMetadata={handleLoadedMetadata}
              onPause={handlePause}
              onError={() => setVideoError(true)}
              preload="metadata"
            />
          ) : hasVideo && videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-3 text-slate-600 dark:text-slate-400 p-6 text-center">
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
                  if (isQuizTab && !isInstructor) {
                    // Eligible student — go straight to the dedicated quiz page
                    navigate(`/quiz/${activeLecture._id}`);
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                title={quizLocked ? quizStatus?.message : ''}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : quizLocked
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer'
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
            <>
              <LectureSummary lectureId={activeLecture._id} hasAccess={hasFullAccess} />
              <div className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06] space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeLecture.title}</h2>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                {activeLecture.video?.duration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-primary-400" />
                    {formatDuration(activeLecture.video.duration)}
                  </span>
                )}

                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  lecturesData?.isFree || activeLecture.isFree
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-400'
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
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{activeLecture.description}</p>
              ) : (
                <p className="text-sm text-slate-500 italic">No description for this lecture.</p>
              )}
            </div>
            </>
          )}

          {activeTab === 'transcript' && activeLecture && (
            <TranscriptPanel
              lectureId={activeLecture._id}
              videoRef={videoRef}
              hasAccess={hasFullAccess}
            />
          )}

          {activeTab === 'discussion' && activeLecture && (
            <DiscussionPanel lectureId={activeLecture._id} courseId={courseId} hasAccess={hasFullAccess} />
          )}

          {activeTab === 'quiz' && activeLecture && (
            <div className="glass rounded-2xl p-8 border border-slate-900/[0.06] dark:border-white/[0.06] text-center">
              {isInstructor ? (
                <>
                  <BookOpen size={36} className="text-primary-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Quiz preview</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                    As the course owner, manage and preview this lecture's quiz from the course management page.
                  </p>
                  <button
                    onClick={() => navigate(`/quiz/${activeLecture._id}`)}
                    className="gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                  >
                    <PlayCircle size={15} /> Open Quiz Page
                  </button>
                </>
              ) : quizStatus?.eligible ? (
                <>
                  <PlayCircle size={36} className="text-primary-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Ready to start your quiz</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                    20 questions · {quizStatus.attemptsLeft} attempt{quizStatus.attemptsLeft !== 1 ? 's' : ''} left · 20 minute timer
                  </p>
                  <button
                    onClick={() => navigate(`/quiz/${activeLecture._id}`)}
                    className="gradient-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                  >
                    <PlayCircle size={15} /> Start Quiz
                  </button>
                </>
              ) : (
                <>
                  <Lock size={36} className="text-slate-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Quiz locked</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{quizStatus?.message || 'Checking eligibility...'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — Lecture List */}
      <div className="w-full lg:w-80 glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Course Content</h3>
          <p className="text-xs text-slate-500 mt-0.5">{lectures.length} lectures</p>

          {/* Progress bar — only for students */}
          {!isInstructor && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
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
            const isEnrollmentLocked = !isInstructor && !isEnrolled && !lecturesData?.isFree && !lecture.isFree;
            const isDripLocked = !!lecture.isDripLocked; // NEW — Phase 4, backend-computed
            const isLocked = isEnrollmentLocked || isDripLocked;

            return (
              <button
                key={lecture._id}
                onClick={() => !isLocked && switchLecture(lecture)}
                className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                  isActive
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'hover:bg-slate-900/5 dark:hover:bg-white/5'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                      ? 'bg-primary-500/30 text-primary-400'
                      : 'bg-slate-900/5 dark:bg-white/5 text-slate-500'
                  }`}>
                    {isLocked ? <Lock size={10} /> : isDone ? <CheckCircle size={12} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${
                      isActive ? 'text-primary-300' : isDone ? 'text-slate-600 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {lecture.title}
                    </p>
                    {lecture.video?.duration > 0 && !isDripLocked && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDuration(lecture.video.duration)}
                      </p>
                    )}
                    {isDripLocked && (
                      <p className="text-xs text-yellow-500 mt-0.5">
                        Available {new Date(lecture.releaseDate).toLocaleDateString()}
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
