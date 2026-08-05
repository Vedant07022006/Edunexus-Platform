import { useState, useEffect } from 'react';
import { Receipt, RotateCcw, Loader2 } from 'lucide-react';
import { getCoursePayments, refundPayment } from '../../services/api.service';
import toast from 'react-hot-toast';

export default function PaymentsPanel({ courseId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);

  const load = () => {
    getCoursePayments(courseId)
      .then(({ data }) => setPayments(data.data.payments || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const handleRefund = async (paymentId) => {
    if (!window.confirm('Refund this payment? The student will lose access to the course.')) return;
    setRefundingId(paymentId);
    try {
      await refundPayment(paymentId, { reason: 'Instructor-initiated refund' });
      toast.success('Refund processed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally {
      setRefundingId(null);
    }
  };

  if (loading) return null;
  if (payments.length === 0) return null;

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-6 mb-6">
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Receipt size={16} className="text-primary-400" /> Payments
      </h2>
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/5 dark:bg-white/5 text-sm">
            <div>
              <span className="font-medium text-slate-900 dark:text-white">{p.user?.fullName || 'Student'}</span>
              <span className="text-slate-500 ml-2">₹{p.amount}</span>
            </div>
            <button
              onClick={() => handleRefund(p._id)}
              disabled={refundingId === p._id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-60"
            >
              {refundingId === p._id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Refund
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
