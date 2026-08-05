import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { checkEnrollment, getCourseById } from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import { Award, Download, ArrowLeft, Loader2 } from 'lucide-react';

export default function CertificatePage() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const [course, setCourse]         = useState(null);
  const [eligible, setEligible]     = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: enData }, { data: courseData }] = await Promise.all([
          checkEnrollment(courseId),
          getCourseById(courseId),
        ]);
        const enrollment = enData.data?.enrollment;
        setCourse(courseData.data);
        setEligible(enrollment?.progress === 100);
        setCompletedAt(enrollment?.updatedAt || null);
      } catch {
        setEligible(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={28} />
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 text-center px-4">
          <p className="text-slate-600 dark:text-slate-400">
            Complete 100% of this course to unlock your certificate.
          </p>
          <Link to={`/learn/${courseId}`} className="text-primary-400 hover:text-primary-300 text-sm mt-3 inline-block">
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(completedAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="pt-24 pb-12 max-w-3xl mx-auto px-4 print:pt-0 print:max-w-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to={`/learn/${courseId}`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={14} /> Back to course
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl gradient-primary text-white hover:opacity-90 transition-opacity"
          >
            <Download size={14} /> Download / Print
          </button>
        </div>

        <div className="border-4 border-primary-500/40 rounded-2xl p-10 sm:p-14 text-center bg-white dark:bg-surface-2 print:border-slate-900 print:shadow-none">
          <Award size={48} className="mx-auto text-yellow-500" />
          <p className="text-xs tracking-[0.3em] uppercase text-slate-500 mt-4">Certificate of Completion</p>
          <p className="text-sm text-slate-500 mt-8">This certifies that</p>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mt-2 mb-8">{user?.fullName}</h1>
          <p className="text-sm text-slate-500">has successfully completed the course</p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2 mb-8">
            {course?.title}
          </h2>
          <p className="text-sm text-slate-500">Completed on {dateStr}</p>
          <p className="text-xs text-slate-500 mt-1">Instructor: {course?.instructor?.fullName || 'EduNexus'}</p>
          <p className="text-[10px] text-slate-500 mt-10 tracking-widest">EDUNEXUS · ONLINE LEARNING PLATFORM</p>
        </div>
      </div>
    </div>
  );
}
