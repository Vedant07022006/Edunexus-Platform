import api from '../lib/api';

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
export const deleteAccount   = ()     => api.delete('/users/delete-account');

// Courses
export const getAllCourses        = (params) => api.get('/courses', { params });
export const getCourseById        = (id)     => api.get(`/courses/${id}`);
export const searchCourses        = (q)      => api.get('/courses/search', { params: { q } });
export const getCoursesByCategory = (cat)    => api.get(`/courses/category/${cat}`);
export const getMyCourses         = ()       => api.get('/courses/my/courses');
export const createCourse         = (data)   => api.post('/courses', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCourse         = (id, data) => api.patch(`/courses/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCourse         = (id)     => api.delete(`/courses/${id}`);
export const restoreCourse        = (id)     => api.patch(`/courses/${id}/restore`);
export const publishCourse        = (id)     => api.patch(`/courses/${id}/publish`);

// Lectures
export const getCourseLectures    = (courseId) => api.get(`/lectures/course/${courseId}`);
export const getLectureById       = (id)       => api.get(`/lectures/${id}`);
export const getInstructorLectures= (courseId) => api.get(`/lectures/instructor/course/${courseId}`);
export const addLecture           = (courseId, data) => api.post(`/lectures/course/${courseId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateLecture        = (id, data) => api.patch(`/lectures/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteLecture        = (id)       => api.delete(`/lectures/${id}`);

// Enrollments
export const enrollFreeCourse     = (courseId) => api.post(`/enrollments/enroll/${courseId}`);
export const checkEnrollment      = (courseId) => api.get(`/enrollments/check/${courseId}`);
export const getMyEnrollments     = ()         => api.get('/enrollments/my-enrollments');
export const updateProgress       = (courseId, data) => api.patch(`/enrollments/progress/${courseId}`, data);
export const getCourseEnrollments = (courseId) => api.get(`/enrollments/course/${courseId}`);
export const revokeEnrollment     = (id)       => api.patch(`/enrollments/revoke/${id}`);
export const restoreEnrollment    = (id)       => api.patch(`/enrollments/restore/${id}`);

// Payments
export const createOrder          = (courseId) => api.post(`/payments/create-order/${courseId}`);
export const verifyPayment        = (data)     => api.post('/payments/verify', data);
export const getPaymentHistory    = ()         => api.get('/payments/history');
export const getCoursePayments    = (courseId) => api.get(`/payments/course/${courseId}`);

// Transcripts
export const generateTranscript   = (lectureId) => api.post(`/transcripts/generate/${lectureId}`);
export const getTranscript        = (lectureId)  => api.get(`/transcripts/${lectureId}`);
export const deleteTranscript     = (lectureId)  => api.delete(`/transcripts/${lectureId}`);

// Quizzes
export const generateQuiz         = (lectureId, data) => api.post(`/quizzes/generate/${lectureId}`, data);
export const regenerateQuiz       = (lectureId, data) => api.post(`/quizzes/regenerate/${lectureId}`, data);
export const getQuizByLecture     = (lectureId)       => api.get(`/quizzes/${lectureId}`);
export const deleteQuiz           = (lectureId)       => api.delete(`/quizzes/${lectureId}`);

// Quiz Attempts
export const submitQuiz           = (lectureId, data) => api.post(`/quiz-attempts/submit/${lectureId}`, data);
export const getMyAttempts        = (lectureId)       => api.get(`/quiz-attempts/my-attempts/${lectureId}`);
export const getBestScore         = (lectureId)       => api.get(`/quiz-attempts/best-score/${lectureId}`);
export const getLeaderboard       = (courseId)        => api.get(`/quiz-attempts/leaderboard/${courseId}`);
export const getAttemptDetails    = (attemptId)       => api.get(`/quiz-attempts/attempt/${attemptId}`);
