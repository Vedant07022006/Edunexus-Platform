import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Loader2 } from 'lucide-react';
import { createCoupon, getCourseCoupons, deleteCoupon } from '../../services/api.service';
import toast from 'react-hot-toast';

export default function CouponPanel({ courseId }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discountPercent: '', maxUses: '', expiresAt: '' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    getCourseCoupons(courseId)
      .then(({ data }) => setCoupons(data.data.coupons))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discountPercent) return toast.error('Code and discount % required');
    setCreating(true);
    try {
      await createCoupon(courseId, {
        code: form.code,
        discountPercent: Number(form.discountPercent),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Coupon created');
      setForm({ code: '', discountPercent: '', maxUses: '', expiresAt: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (couponId) => {
    try {
      await deleteCoupon(couponId);
      setCoupons((p) => p.filter((c) => c._id !== couponId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Tag size={16} className="text-primary-400" /> Coupons
        </h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg gradient-primary text-white hover:opacity-90">
          <Plus size={12} /> New Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid sm:grid-cols-4 gap-2 mb-4 p-3 rounded-xl bg-slate-900/5 dark:bg-white/5">
          <input placeholder="CODE" value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-surface-3 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white" />
          <input placeholder="Discount %" type="number" min="1" max="90" value={form.discountPercent}
            onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
            className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-surface-3 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white" />
          <input placeholder="Max uses (opt.)" type="number" value={form.maxUses}
            onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
            className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-surface-3 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-white" />
          <button type="submit" disabled={creating}
            className="px-3 py-2 text-sm rounded-lg gradient-primary text-white disabled:opacity-60 flex items-center justify-center gap-1.5">
            {creating && <Loader2 size={12} className="animate-spin" />} Create
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-slate-500">No coupons yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/5 dark:bg-white/5 text-sm">
              <div>
                <span className="font-mono font-bold text-primary-400">{c.code}</span>
                <span className="text-slate-600 dark:text-slate-400 ml-2">{c.discountPercent}% off</span>
                <span className="text-slate-500 ml-2">— {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} used</span>
              </div>
              <button onClick={() => handleDelete(c._id)} className="text-slate-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
