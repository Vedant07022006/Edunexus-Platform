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

  const getEnrollmentInfo = (bundle) => {
    if (!user || !user.enrolledCourses) {
      return {
        enrolledIds: new Set(),
        ownedCount: 0,
        totalCount: bundle.courses.length,
        isFullyOwned: false,
        isPartiallyOwned: false,
        discountedPrice: bundle.price
      };
    }
    const enrolledIds = new Set(user.enrolledCourses.map(e => (e.course?._id || e.course || "").toString()));
    const activeCourses = bundle.courses.filter(c => !c.isArchived);
    const owned = activeCourses.filter(c => enrolledIds.has(c._id.toString()));
    
    const ownedCount = owned.length;
    const totalCount = activeCourses.length;
    const isFullyOwned = totalCount > 0 && ownedCount === totalCount;
    const isPartiallyOwned = ownedCount > 0 && ownedCount < totalCount;
    
    // Proportional price discount
    const discountedPrice = totalCount > 0 
      ? Math.round((bundle.price * ((totalCount - ownedCount) / totalCount)) * 100) / 100
      : bundle.price;

    return {
      enrolledIds,
      ownedCount,
      totalCount,
      isFullyOwned,
      isPartiallyOwned,
      discountedPrice
    };
  };

  const handleBuy = async (bundle) => {
    if (!user) return navigate('/login');
    setBuyingId(bundle._id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Payment service unavailable'); return; }

      const { data } = await createBundleOrder(bundle._id);
      const { orderId, amount, currency, keyId, bundlePrice } = data.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount,
        currency,
        name: 'EduNexus',
        description: `${bundle.title} - Complete My Bundle`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await verifyBundlePayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast.success('Bundle purchased successfully!');
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
            {bundles.map((b) => {
              const enrolledInfo = getEnrollmentInfo(b);
              return (
                <div key={b._id} className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-5 flex flex-col justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white mb-1">{b.title}</h2>
                    {b.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{b.description}</p>}
                    <p className="text-xs text-slate-500 mb-4">{b.courses.length} courses included</p>
                    
                    <div className="space-y-2 mb-4">
                      {b.courses.map((c) => {
                        const isOwned = enrolledInfo.enrolledIds?.has(c._id.toString());
                        return (
                          <div key={c._id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">• {c.title}</span>
                            {user && (
                              isOwned ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium text-[10px]">
                                  ✓ Owned
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium text-[10px]">
                                  + Will Unlock
                                </span>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    {user && enrolledInfo.isPartiallyOwned && (
                      <p className="text-[11px] text-amber-500 font-medium mb-3">
                        💡 Complete My Bundle: You already own {enrolledInfo.ownedCount} of {enrolledInfo.totalCount} courses. Price has been discounted!
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        {user && enrolledInfo.isPartiallyOwned ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              ₹{enrolledInfo.discountedPrice}
                            </span>
                            <span className="text-xs line-through text-slate-400">
                              ₹{b.price}
                            </span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            ₹{b.price}
                          </p>
                        )}
                      </div>

                      {user && enrolledInfo.isFullyOwned ? (
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 font-semibold text-xs flex items-center gap-1.5">
                          ✓ Enrolled
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuy(b)}
                          disabled={buyingId === b._id}
                          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl gradient-primary text-white hover:opacity-90 disabled:opacity-60"
                        >
                          {buyingId === b._id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                          Buy Bundle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
