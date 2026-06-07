// import { motion } from 'framer-motion';
// import { Link, useNavigate } from 'react-router-dom';
// import { useState, useEffect } from 'react';
// import {
//   BookOpen, Clock, Users, Star, Globe, BarChart3,
//   Tag, CheckCircle, Lock, Play, ShoppingCart, Zap, Archive
// } from 'lucide-react';
// import { getCourseById, checkEnrollment, enrollFreeCourse, createOrder, verifyPayment } from '../../services/api.service';
// import { useAuth } from '../../context/AuthContext';
// import Button from '../ui/Button';
// import toast from 'react-hot-toast';

// const levelColors = {
//   beginner: 'bg-emerald-500/20 text-emerald-400',
//   intermediate: 'bg-yellow-500/20 text-yellow-400',
//   advanced: 'bg-red-500/20 text-red-400',
// };

// export default function CourseDetails({ courseId }) {
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [enrolled, setEnrolled] = useState(false);
//   const [enrollLoading, setEnrollLoading] = useState(false);

//   useEffect(() => {
//     const fetch = async () => {
//       try {
//         const { data } = await getCourseById(courseId);
//         setCourse(data.data);
//         if (user && user.role === 'student') {
//           const enroll = await checkEnrollment(courseId);
//           setEnrolled(enroll.data.data.isEnrolled);
//         }
//       } catch (e) {
//         toast.error(e.response?.data?.message || 'Failed to load course');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetch();
//   }, [courseId, user]);

//   const handleEnrollFree = async () => {
//     if (!user) return navigate('/login');
//     setEnrollLoading(true);
//     try {
//       await enrollFreeCourse(courseId);
//       setEnrolled(true);
//       toast.success('Enrolled successfully!');
//     } catch (e) {
//       toast.error(e.response?.data?.message || 'Enrollment failed');
//     } finally {
//       setEnrollLoading(false);
//     }
//   };

//   const handlePayment = async () => {
//     if (!user) return navigate('/login');
//     setEnrollLoading(true);
//     try {
//       const { data } = await createOrder(courseId);
//       const { orderId, amount, currency, keyId } = data.data;

//       const options = {
//         key: keyId,
//         amount: amount * 100,
//         currency,
//         name: 'EduNexus',
//         description: course.title,
//         order_id: orderId,
//         handler: async (response) => {
//           try {
//             await verifyPayment({
//               razorpayOrderId: response.razorpay_order_id,
//               razorpayPaymentId: response.razorpay_payment_id,
//               razorpaySignature: response.razorpay_signature,
//             });
//             setEnrolled(true);
//             toast.success('Payment successful! Starting your course...');
//             setTimeout(() => navigate(`/learn/${courseId}`), 1500);
//           } catch (e) {
//             toast.error('Payment verification failed. Contact support.');
//           }
//         },
//         theme: { color: '#6366f1' },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();
//     } catch (e) {
//       toast.error(e.response?.data?.message || 'Payment initiation failed');
//     } finally {
//       setEnrollLoading(false);
//     }
//   };

//   if (loading) return (
//     <div className="min-h-screen pt-20 flex items-center justify-center">
//       <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
//     </div>
//   );

//   if (!course) return null;

//   const hours = ((course.totalDuration || 0) / 3600).toFixed(1);
//   const isInstructor = user && course.instructor?._id === user._id;

//   return (
//     <div className="min-h-screen pt-20">
//       {/* Hero */}
//       <div className="bg-gradient-to-b from-surface-3 to-surface border-b border-white/[0.06]">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//           <div className="grid lg:grid-cols-3 gap-10">
//             {/* Left */}
//             <div className="lg:col-span-2">
//               <div className="flex flex-wrap gap-2 mb-4">
//                 <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColors[course.level] || levelColors.beginner}`}>
//                   {course.level}
//                 </span>
//                 <span className="text-xs bg-primary-500/20 text-primary-300 px-2.5 py-1 rounded-full">
//                   {course.category}
//                 </span>
//               </div>

//               <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{course.title}</h1>
//               <p className="mt-4 text-slate-400 leading-relaxed">{course.description}</p>

//               <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-400">
//                 <span className="flex items-center gap-1.5"><BookOpen size={15} className="text-primary-400" />{course.totalLectures} lectures</span>
//                 <span className="flex items-center gap-1.5"><Clock size={15} className="text-primary-400" />{hours}h total</span>
//                 <span className="flex items-center gap-1.5"><Users size={15} className="text-primary-400" />{course.totalEnrollments} students</span>
//                 <span className="flex items-center gap-1.5"><Globe size={15} className="text-primary-400" />{course.language}</span>
//               </div>

//               {course.rating?.totalRatings > 0 && (
//                 <div className="mt-4 flex items-center gap-2">
//                   <Star size={16} className="text-yellow-400" fill="currentColor" />
//                   <span className="text-yellow-400 font-semibold">{course.rating.average.toFixed(1)}</span>
//                   <span className="text-slate-500 text-sm">({course.rating.totalRatings} ratings)</span>
//                 </div>
//               )}

//               <div className="mt-4 flex items-center gap-3">
//                 <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
//                   {course.instructor?.fullName?.[0]}
//                 </div>
//                 <div>
//                   <p className="text-xs text-slate-500">Instructor</p>
//                   <p className="text-sm font-medium text-white">{course.instructor?.fullName}</p>
//                 </div>
//               </div>

//               {course.tags?.length > 0 && (
//                 <div className="mt-6 flex flex-wrap gap-2">
//                   {course.tags.map(tag => (
//                     <span key={tag} className="flex items-center gap-1 text-xs bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full">
//                       <Tag size={10} /> {tag}
//                     </span>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Right — Enrollment Card */}
//             <div className="lg:col-span-1">
//               <div className="glass-strong rounded-2xl p-6 border border-white/10 sticky top-24">
//                 {/* Thumbnail */}
//                 {course.thumbnail?.url && (
//                   <img src={course.thumbnail.url} alt={course.title} className="w-full aspect-video object-cover rounded-xl mb-5" />
//                 )}

//                 <div className="mb-5">
//                   {course.isFree ? (
//                     <span className="text-3xl font-bold text-emerald-400">Free</span>
//                   ) : (
//                     <span className="text-3xl font-bold text-white">₹{course.price}</span>
//                   )}
//                 </div>

//                 {course.isArchived && enrolled && (
//                   <div className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
//                     <Archive size={16} className="text-amber-400 mt-0.5 shrink-0" />
//                     <p className="text-xs text-amber-300/90 leading-relaxed">
//                       This course has been archived, but you retain full access to all content.
//                     </p>
//                   </div>
//                 )}

//                 {course.isArchived && !enrolled && !isInstructor ? (
//                   <div className="text-center py-4">
//                     <Archive size={32} className="text-slate-500 mx-auto mb-3" />
//                     <p className="text-slate-400 font-medium">This course is no longer available</p>
//                     <p className="text-xs text-slate-500 mt-1">This course has been archived and is not accepting new enrollments.</p>
//                   </div>
//                 ) : isInstructor ? (
//                   <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate(`/instructor/courses/${courseId}`)}>
//                     Manage Course
//                   </Button>
//                 ) : enrolled ? (
//                   <Button size="lg" className="w-full" onClick={() => navigate(`/learn/${courseId}`)}>
//                     <Play size={18} /> Continue Learning
//                   </Button>
//                 ) : course.isFree ? (
//                   <Button size="lg" className="w-full" loading={enrollLoading} onClick={handleEnrollFree}>
//                     <Zap size={18} /> Enroll for Free
//                   </Button>
//                 ) : (
//                   <Button size="lg" className="w-full" loading={enrollLoading} onClick={handlePayment}>
//                     <ShoppingCart size={18} /> Enroll Now — ₹{course.price}
//                   </Button>
//                 )}

//                 <div className="mt-5 space-y-2 text-sm text-slate-400">
//                   {['Full lifetime access', 'AI-generated quizzes', 'Video transcripts', 'Certificate of completion'].map(f => (
//                     <div key={f} className="flex items-center gap-2">
//                       <CheckCircle size={13} className="text-emerald-400" />
//                       {f}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }






import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  BookOpen, Clock, Users, Star, Globe, Tag,
  CheckCircle, Play, ShoppingCart, Zap, Archive,
} from 'lucide-react';
import {
  getCourseById, checkEnrollment, enrollFreeCourse,
  createOrder, verifyPayment,
} from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const levelColors = {
  beginner:     'bg-emerald-500/20 text-emerald-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced:     'bg-red-500/20 text-red-400',
};

/** Dynamically loads the Razorpay checkout script if not already present. */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const script = document.createElement('script');
    script.id  = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const COURSE_FEATURES = [
  'Full lifetime access',
  'AI-generated quizzes',
  'Video transcripts',
  'Certificate of completion',
];

export default function CourseDetails({ courseId }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [course, setCourse]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [enrolled, setEnrolled]       = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getCourseById(courseId);
        setCourse(data.data);

        if (user?.role === 'student') {
          const { data: enrollData } = await checkEnrollment(courseId);
          setEnrolled(enrollData.data.isEnrolled);
        }
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, user]);

  const handleEnrollFree = async () => {
    if (!user) return navigate('/login');
    setEnrollLoading(true);
    try {
      await enrollFreeCourse(courseId);
      setEnrolled(true);
      toast.success('Enrolled successfully!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user) return navigate('/login');
    setEnrollLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment service unavailable. Please try again.');
        setEnrollLoading(false);
        return;
      }

      const { data } = await createOrder(courseId);
      const { orderId, amount, currency, keyId } = data.data;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency,
        name: 'EduNexus',
        description: course.title,
        order_id: orderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setEnrolled(true);
            toast.success('Payment successful! Starting your course...');
            setTimeout(() => navigate(`/learn/${courseId}`), 1500);
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => setEnrollLoading(false),
        },
        theme: { color: '#6366f1' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setEnrollLoading(false);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payment initiation failed');
      setEnrollLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  const hours        = ((course.totalDuration || 0) / 3600).toFixed(1);
  const isInstructor = user && course.instructor?._id === user._id;

  return (
    <div className="min-h-screen pt-20">
      <div className="bg-gradient-to-b from-surface-3 to-surface border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Left: Course Info */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColors[course.level] || levelColors.beginner}`}>
                  {course.level}
                </span>
                <span className="text-xs bg-primary-500/20 text-primary-300 px-2.5 py-1 rounded-full">
                  {course.category}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{course.title}</h1>
              <p className="mt-4 text-slate-400 leading-relaxed">{course.description}</p>

              <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><BookOpen size={15} className="text-primary-400" />{course.totalLectures} lectures</span>
                <span className="flex items-center gap-1.5"><Clock size={15} className="text-primary-400" />{hours}h total</span>
                <span className="flex items-center gap-1.5"><Users size={15} className="text-primary-400" />{course.totalEnrollments} students</span>
                <span className="flex items-center gap-1.5"><Globe size={15} className="text-primary-400" />{course.language}</span>
              </div>

              {course.rating?.totalRatings > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <Star size={16} className="text-yellow-400" fill="currentColor" />
                  <span className="text-yellow-400 font-semibold">{course.rating.average.toFixed(1)}</span>
                  <span className="text-slate-500 text-sm">({course.rating.totalRatings} ratings)</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {course.instructor?.fullName?.[0]}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Instructor</p>
                  <p className="text-sm font-medium text-white">{course.instructor?.fullName}</p>
                </div>
              </div>

              {course.instructor?.bio && (
                <p className="mt-3 text-sm text-slate-400 italic leading-relaxed max-w-lg">
                  {course.instructor.bio}
                </p>
              )}

              {course.tags?.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Enroll Card */}
            <div className="lg:col-span-1">
              <div className="glass-strong rounded-2xl p-6 border border-white/10 sticky top-24">
                {course.thumbnail?.url && (
                  <img src={course.thumbnail.url} alt={course.title} className="w-full aspect-video object-cover rounded-xl mb-5" />
                )}

                <div className="mb-5">
                  {course.isFree
                    ? <span className="text-3xl font-bold text-emerald-400">Free</span>
                    : <span className="text-3xl font-bold text-white">₹{course.price}</span>
                  }
                </div>

                {course.isArchived && enrolled && (
                  <div className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                    <Archive size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/90 leading-relaxed">
                      This course has been archived, but you retain full access to all content.
                    </p>
                  </div>
                )}

                {course.isArchived && !enrolled && !isInstructor ? (
                  <div className="text-center py-4">
                    <Archive size={32} className="text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">This course is no longer available</p>
                    <p className="text-xs text-slate-500 mt-1">Archived and not accepting new enrollments.</p>
                  </div>
                ) : isInstructor ? (
                  <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate(`/instructor/courses/${courseId}`)}>
                    Manage Course
                  </Button>
                ) : enrolled ? (
                  <Button size="lg" className="w-full" onClick={() => navigate(`/learn/${courseId}`)}>
                    <Play size={18} /> Continue Learning
                  </Button>
                ) : course.isFree ? (
                  <Button size="lg" className="w-full" loading={enrollLoading} onClick={handleEnrollFree}>
                    <Zap size={18} /> Enroll for Free
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" loading={enrollLoading} onClick={handlePayment}>
                    <ShoppingCart size={18} /> Enroll Now — ₹{course.price}
                  </Button>
                )}

                <div className="mt-5 space-y-2 text-sm text-slate-400">
                  {COURSE_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}