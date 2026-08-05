import { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, ShieldCheck, Loader2, Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLectureComments, postComment, deleteComment, createReport } from '../../services/api.service';
import toast from 'react-hot-toast';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function DiscussionPanel({ lectureId, courseId, hasAccess }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [replyTo, setReplyTo]   = useState(null); // { id, name }
  const [posting, setPosting]   = useState(false);

  const load = () => {
    if (!hasAccess || !lectureId) { setLoading(false); return; }
    setLoading(true);
    getLectureComments(lectureId)
      .then(({ data }) => setComments(data.data.comments))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [lectureId, hasAccess]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await postComment(lectureId, { text, parentComment: replyTo?.id || null });
      setText('');
      setReplyTo(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteComment(id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  // NEW — Phase 5
  const handleReport = async (commentId) => {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason?.trim()) return;
    try {
      await createReport({ targetType: 'comment', targetId: commentId, courseId, reason: reason.trim() });
      toast.success('Report submitted — an instructor will review it');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    }
  };

  if (!hasAccess) {
    return (
      <div className="glass rounded-2xl p-8 border border-slate-900/[0.06] dark:border-white/[0.06] text-center">
        <MessageSquare size={32} className="text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Enroll in this course to join the discussion.</p>
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parentComment);
  const repliesOf = (id) => comments.filter((c) => c.parentComment === id);

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden">
      <div className="p-4 border-b border-slate-900/[0.06] dark:border-white/[0.06] flex items-center gap-2">
        <MessageSquare size={16} className="text-primary-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Discussion ({comments.length})</h3>
      </div>

      <form onSubmit={handlePost} className="p-4 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Replying to {replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-slate-900 dark:hover:text-white">Cancel</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question or share a thought..."
            maxLength={1000}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl gradient-primary text-white flex items-center justify-center disabled:opacity-50"
          >
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </form>

      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-primary-500" />
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No comments yet — start the discussion!</p>
        ) : (
          topLevel.map((c) => (
            <div key={c._id}>
              <CommentRow comment={c} currentUserId={user?._id} onDelete={handleDelete} onReport={handleReport}
                onReply={() => setReplyTo({ id: c._id, name: c.user?.fullName })} />
              {repliesOf(c._id).map((r) => (
                <div key={r._id} className="ml-8 mt-2">
                  <CommentRow comment={r} currentUserId={user?._id} onDelete={handleDelete} onReport={handleReport} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CommentRow({ comment, currentUserId, onDelete, onReply, onReport }) {
  const isOwner = comment.user?._id === currentUserId;
  return (
    <div className={`flex items-start gap-2.5 ${comment.isInstructorReply ? 'bg-primary-500/5 -mx-2 px-2 py-2 rounded-xl' : ''}`}>
      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {comment.user?.fullName?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.user?.fullName}</span>
          {comment.isInstructorReply && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded-full">
              <ShieldCheck size={10} /> Instructor
            </span>
          )}
          <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">{comment.text}</p>
        <div className="flex items-center gap-3 mt-1">
          {onReply && (
            <button onClick={onReply} className="text-xs text-slate-500 hover:text-primary-400">Reply</button>
          )}
          {isOwner && (
            <button onClick={() => onDelete(comment._id)} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
              <Trash2 size={10} /> Delete
            </button>
          )}
          {!isOwner && onReport && (
            <button onClick={() => onReport(comment._id)} className="text-xs text-slate-500 hover:text-yellow-400 flex items-center gap-1">
              <Flag size={10} /> Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
