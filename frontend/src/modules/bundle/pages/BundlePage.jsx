import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getAllBundles, createBundleOrder, verifyBundlePayment } from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import { Package, ShoppingCart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function BundlesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  useEffect(() => {
    getAllBundles()
      .then(({ data }) => setBundles(data.data.bundles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (bundle) => {
    if (!user) return navigate('/login');
    setBuyingId(bundle._id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Payment service unavailable'); return; }

      const { data } = await createBundleOrder(bundle._id);
      const { orderId, amount, currency, keyId } = data.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount,
        currency,
        name: 'EduNexus',
        description: bundle.title,
        order_id: orderId,
        handler: async (response) => {
          try {
            await verifyBundlePayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast.success('Bundle purchased! Enrolled in all courses.');
            navigate('/dashboard');
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setBuyingId(null) },
        theme: { color: '#6366f1' },
      });
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setBuyingId(null); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start purchase');
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 mb-8">
          <Package size={22} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Course Bundles</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={24} /></div>
        ) : bundles.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-16">No bundles available yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {bundles.map((b) => (
              <div key={b._id} className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-5">
                <h2 className="font-bold text-slate-900 dark:text-white mb-1">{b.title}</h2>
                {b.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{b.description}</p>}
                <p className="text-xs text-slate-500 mb-4">{b.courses.length} courses included</p>
                <div className="space-y-1 mb-4">
                  {b.courses.map((c) => (
                    <p key={c._id} className="text-xs text-slate-600 dark:text-slate-400">• {c.title}</p>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">₹{b.price}</p>
                  <button
                    onClick={() => handleBuy(b)}
                    disabled={buyingId === b._id}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl gradient-primary text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {buyingId === b._id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                    Buy Bundle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
