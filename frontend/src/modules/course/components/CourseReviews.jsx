import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  getCourseReviews, getMyReviewForCourse, createOrUpdateReview, deleteReview,
} from '../../shared/services/api.service';
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
      // ignore
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
      const { data } = await createOrUpdateReview(courseId, { rating, comment });
      const wasUpdate = !!myReview;
      setMyReview(data.data);
      toast.success(wasUpdate ? 'Review updated' : 'Review submitted');
      loadReviews(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your review?')) return;
    try {
      await deleteReview(courseId);
      setMyReview(null);
      setRating(0);
      setComment('');
      toast.success('Review deleted');
      loadReviews(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-900/10 dark:border-white/10 pb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-primary-400" />
          Student Reviews ({total})
        </h3>
      </div>

      {canReview && (
        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 border border-slate-900/10 dark:border-white/10 space-y-4">
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
            {myReview ? 'Edit Your Review' : 'Leave a Review'}
          </h4>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Your Rating:</span>
            <StarPicker value={rating} onChange={setRating} size={24} />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Share your thoughts about this course..."
            className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all resize-none"
          />

          <div className="flex items-center justify-between">
            {myReview ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} /> Delete Review
              </button>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="gradient-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 glow-sm"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {myReview ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary-400" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-6">
          No reviews yet. Be the first to review this course!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev._id} className="glass rounded-2xl p-5 border border-slate-900/10 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                    {rev.user?.fullName?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rev.user?.fullName || 'Anonymous'}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(rev.createdAt)}</p>
                  </div>
                </div>

                <StarPicker value={rev.rating} readOnly size={16} />
              </div>

              {rev.comment && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-10">
                  {rev.comment}
                </p>
              )}
            </div>
          ))}

          {page < totalPages && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                Load more reviews
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
