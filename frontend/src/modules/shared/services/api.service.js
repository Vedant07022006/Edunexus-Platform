import api from '../../../lib/api';

// Auth
export const registerUser    = (data) => api.post('/users/register', data);
export const verifyEmailOtp  = (data) => api.post('/users/verify-email-otp', data);
export const resendOtp       = (data) => api.post('/users/resend-otp', data);
export const loginUser       = (data) => api.post('/users/login', data);
export const logoutUser      = ()     => api.post('/users/logout');
export const refreshToken    = ()     => api.post('/users/refresh-token');
export const forgotPassword  = (data) => api.post('/users/forgot-password', data);
export const resetPassword   = (token, data) => api.post(`/users/reset-password/${token}`, data);
export const getMyProfile    = ()     => api.get('/users/me');
export const updateProfile   = (data) => api.patch('/users/update-profile', data);
export const changePassword  = (data) => api.patch('/users/change-password', data);
export const toggleTwoFactor = (enabled) => api.patch('/users/toggle-2fa', { enabled });
export const verifyLoginOtp   = (data) => api.post('/users/login/verify-otp', data);
export const deleteAccount   = ()     => api.delete('/users/delete-account');

// Courses
export const getAllCourses        = (params)    => api.get('/courses', { params });
export const getCourseById        = (id)        => api.get(`/courses/${id}`);
export const searchCourses        = (q)         => api.get('/courses/search', { params: { q } });
export const getCoursesByCategory = (cat)       => api.get(`/courses/category/${cat}`);
export const getMyCourses         = ()          => api.get('/courses/my/courses');
export const getMyArchivedCourses = ()          => api.get('/courses/my/archived');
export const createCourse         = (data)      => api.post('/courses', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const generateCourseAiAssist = (data)    => api.post('/courses/ai-assist', data);
export const updateCourse         = (id, data)  => api.patch(`/courses/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCourse         = (id)        => api.delete(`/courses/${id}`);
export const restoreCourse        = (id)        => api.patch(`/courses/${id}/restore`);
export const publishCourse        = (id)        => api.patch(`/courses/${id}/publish`);

// Lectures
export const getCourseLectures    = (courseId)        => api.get(`/lectures/course/${courseId}`);
export const getLectureById       = (id)              => api.get(`/lectures/${id}`);
export const getInstructorLectures= (courseId)        => api.get(`/lectures/instructor/course/${courseId}`);
export const addLecture           = (courseId, data)  => api.post(`/lectures/course/${courseId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateLecture        = (id, data)        => api.patch(`/lectures/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteLecture        = (id)              => api.delete(`/lectures/${id}`);

// Enrollments
export const enrollFreeCourse     = (courseId)        => api.post(`/enrollments/enroll/${courseId}`);
export const checkEnrollment      = (courseId)        => api.get(`/enrollments/check/${courseId}`);
export const getMyEnrollments     = ()                => api.get('/enrollments/my-enrollments');
export const getMyPurchases       = (params)          => api.get('/enrollments/my-purchases', { params });
export const updateProgress       = (courseId, data)  => api.patch(`/enrollments/progress/${courseId}`, data);
export const updateLastWatchedPosition = (courseId, data) => api.patch(`/enrollments/position/${courseId}`, data);
export const getCourseEnrollments = (courseId)        => api.get(`/enrollments/course/${courseId}`);
export const revokeEnrollment     = (id)              => api.patch(`/enrollments/revoke/${id}`);
export const restoreEnrollment    = (id)              => api.patch(`/enrollments/restore/${id}`);

// Payments
export const createOrder          = (courseId, data)  => api.post(`/payments/create-order/${courseId}`, data);
export const verifyPayment        = (data)     => api.post('/payments/verify', data);
export const getPaymentHistory    = ()         => api.get('/payments/history');
export const getCoursePayments    = (courseId) => api.get(`/payments/course/${courseId}`);

// Revenue (Instructor)
export const getRevenueStats      = ()         => api.get('/revenue/stats');
export const getRevenueCourses    = (params)   => api.get('/revenue/courses', { params });

// Transcripts
export const generateTranscript   = (lectureId) => api.post(`/transcripts/generate/${lectureId}`);
export const generateSummary      = (lectureId) => api.post(`/transcripts/generate-summary/${lectureId}`);
export const getTranscript        = (lectureId)  => api.get(`/transcripts/${lectureId}`);
export const deleteTranscript     = (lectureId)  => api.delete(`/transcripts/${lectureId}`);
export const getTranscriptForViewer = (lectureId) => api.get(`/transcripts/${lectureId}/view`);

// Quizzes
export const generateQuiz         = (lectureId, data) => api.post(`/quizzes/generate/${lectureId}`, data);
export const regenerateQuiz       = (lectureId, data) => api.post(`/quizzes/regenerate/${lectureId}`, data);
export const getQuizByLecture     = (lectureId)       => api.get(`/quizzes/${lectureId}`);
export const deleteQuiz           = (lectureId)       => api.delete(`/quizzes/${lectureId}`);
export const createManualQuiz     = (lectureId, data) => api.post(`/quizzes/manual/${lectureId}`, data);
export const updateManualQuiz     = (lectureId, data) => api.patch(`/quizzes/manual/${lectureId}`, data);
export const getAiQuota           = (courseId)        => api.get(`/quizzes/ai-quota/${courseId}`);

// Quiz Attempts
export const checkQuizEligibility = (lectureId)       => api.get(`/quiz-attempts/eligibility/${lectureId}`);
export const submitQuiz           = (lectureId, data) => api.post(`/quiz-attempts/submit/${lectureId}`, data);
export const getMyAttempts        = (lectureId)       => api.get(`/quiz-attempts/my-attempts/${lectureId}`);
export const getBestScore         = (lectureId)       => api.get(`/quiz-attempts/best-score/${lectureId}`);
export const getLeaderboard       = (courseId)        => api.get(`/quiz-attempts/leaderboard/${courseId}`);
export const getAttemptDetails    = (attemptId)       => api.get(`/quiz-attempts/attempt/${attemptId}`);
export const generateWeakSpotReview = (attemptId)     => api.post(`/quiz-attempts/weak-spots/${attemptId}`);

// Chatbot
export const askChatbot        = (data) => api.post('/chatbot/ask', data);
export const getChatbotUsage   = ()     => api.get('/chatbot/usage');

// Reviews
export const getCourseReviews     = (courseId, params) => api.get(`/reviews/course/${courseId}`, { params });
export const getMyReviewForCourse = (courseId)          => api.get(`/reviews/course/${courseId}/mine`);
export const createOrUpdateReview  = (courseId, data)    => api.post(`/reviews/course/${courseId}`, data);
export const deleteReview         = (courseId)          => api.delete(`/reviews/course/${courseId}`);

// Discussions / Q&A
export const getLectureComments = (lectureId)        => api.get(`/discussions/lecture/${lectureId}`);
export const createComment      = (lectureId, data)  => api.post(`/discussions/lecture/${lectureId}`, data);
export const deleteComment      = (commentId)        => api.delete(`/discussions/${commentId}`);

// Coupons
export const createCoupon      = (courseId, data) => api.post(`/coupons/course/${courseId}`, data);
export const getCourseCoupons  = (courseId)        => api.get(`/coupons/course/${courseId}`);
export const deleteCoupon      = (couponId)        => api.delete(`/coupons/${couponId}`);
export const validateCoupon    = (courseId, code)  => api.post(`/coupons/course/${courseId}/validate`, { code });

// Bundles
export const createBundle      = (data)       => api.post('/bundles', data);
export const getMyBundles      = ()           => api.get('/bundles/my/bundles');
export const publishBundle     = (bundleId)   => api.patch(`/bundles/${bundleId}/publish`);
export const getBundleById     = (bundleId)   => api.get(`/bundles/${bundleId}`);
export const getAllBundles     = ()           => api.get('/bundles');
export const createBundleOrder  = (bundleId)  => api.post(`/payments/bundle/create-order/${bundleId}`);
export const verifyBundlePayment = (data)     => api.post('/payments/bundle/verify', data);

// Instructor analytics
export const getCourseAnalytics = (courseId) => api.get(`/courses/${courseId}/analytics`);

// Refunds
export const refundPayment = (paymentId, data) => api.post(`/payments/refund/${paymentId}`, data);

// Reports / moderation
export const createReport  = (data)      => api.post('/reports', data);
export const getMyReports  = ()          => api.get('/reports/mine');
export const resolveReport = (reportId, status) => api.patch(`/reports/${reportId}`, { status });
