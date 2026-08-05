import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCourseReviews, getMyReviewForCourse, submitReview, deleteReview,
} from '../../services/api.service';
import toast from 'react-hot-toast';

const StarPicker = ({ value, onChange, size = 22, readOnly = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={readOnly}
        onClick={() => onChange?.(n)}
        className={readOnly ? 'cursor-default' : 'cursor-pointer'}
      >
        <Star
          size={size}
          className={n <= value ? 'text-yellow-400' : 'text-slate-600'}
          fill={n <= value ? 'currentColor' : 'none'}
        />
      </button>
    ))}
  </div>
);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default function CourseReviews({ courseId, isEnrolled }) {
  const { user } = useAuth();

  const [reviews, setReviews]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [myReview, setMyReview]     = useState(null);
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canReview = isEnrolled && user?.role === 'student';

  const loadReviews = useCallback(async (pageNum = 1) => {
    try {
      const { data } = await getCourseReviews(courseId, { page: pageNum, limit: 10 });
      setReviews((prev) => (pageNum === 1 ? data.data.reviews : [...prev, ...data.data.reviews]));
      setTotal(data.data.pagination.total);
      setTotalPages(data.data.pagination.totalPages);
      setPage(pageNum);
    } catch {
      // reviews are a supplementary feature — fail silently rather than
      // blocking the rest of the course details page
    }
  }, [courseId]);

  useEffect(() => {
    setLoading(true);
    loadReviews(1).finally(() => setLoading(false));
  }, [loadReviews]);

  useEffect(() => {
    if (!canReview) return;
    getMyReviewForCourse(courseId)
      .then(({ data }) => {
        const existing = data.data.review;
        if (existing) {
          setMyReview(existing);
          setRating(existing.rating);
          setComment(existing.comment || '');
        }
      })
      .catch(() => {});
  }, [courseId, canReview]);

  const handleLoadMore = async () => {
    if (page >= totalPages) return;
    setLoadingMore(true);
    await loadReviews(page + 1);
    setLoadingMore(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await submitReview(courseId, { rating, comment });
      const wasUpdate = !!myReview;
      setMyReview(data.data);
      toast.success(wasUpdate ? 'Review updated' : 'Review submitted');
      loadReviews(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteReview(courseId);
      setMyReview(null);
      setRating(0);
      setComment('');
      toast.success('Review removed');
      loadReviews(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={18} className="text-primary-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Student Reviews {total > 0 && `(${total})`}
        </h2>
      </div>

      {canReview && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-900/[0.06] dark:border-white/[0.06]">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
            {myReview ? 'Update your review' : 'Rate this course'}
          </p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this course (optional)"
            rows={3}
            maxLength={1000}
            className="w-full mt-3 px-3 py-2 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 resize-none"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {myReview ? 'Update Review' : 'Submit Review'}
            </button>
            {myReview && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          No reviews yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className="pb-4 border-b border-slate-900/[0.06] dark:border-white/[0.06] last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                    {r.user?.fullName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{r.user?.fullName || 'Anonymous'}</span>
                </div>
                <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
              </div>
              <StarPicker value={r.rating} readOnly size={14} />
              {r.comment && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{r.comment}</p>}
            </div>
          ))}

          {page < totalPages && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full text-center text-sm text-primary-400 hover:text-primary-300 py-2 flex items-center justify-center gap-2"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              Load more reviews
            </button>
          )}
        </div>
      )}
    </div>
  );
}
