import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyCourses, createBundle, getMyBundles, publishBundle } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import { Package, ArrowLeft, Loader2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateBundlePage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [myBundles, setMyBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', price: '' });
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [{ data: cData }, { data: bData }] = await Promise.all([getMyCourses(), getMyBundles()]);
      setCourses((cData.data.courses || []).filter((c) => c.isPublished));
      setMyBundles(bData.data.bundles);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleCourse = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price) return toast.error('Title and price required');
    if (selected.length < 2) return toast.error('Select at least 2 courses');

    setCreating(true);
    try {
      await createBundle({ title: form.title, description: form.description, courseIds: selected, price: Number(form.price) });
      toast.success('Bundle created — publish it to make it visible to students');
      setForm({ title: '', description: '', price: '' });
      setSelected([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bundle');
    } finally {
      setCreating(false);
    }
  };

  const handlePublishToggle = async (bundleId) => {
    try {
      await publishBundle(bundleId);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bundle');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12 max-w-2xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigate('/instructor')} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <Package size={22} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Bundle</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-500" size={24} /></div>
        ) : (
          <>
            <form onSubmit={handleCreate} className="glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] p-6 space-y-4 mb-8">
              <Input label="Bundle Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <Input label="Bundle Price (₹)" type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />

              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select courses (min. 2)</p>
                {courses.length === 0 ? (
                  <p className="text-sm text-slate-500">No published courses yet — publish a course first.</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {courses.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => toggleCourse(c._id)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 text-left"
                      >
                        {selected.includes(c._id)
                          ? <CheckSquare size={16} className="text-primary-400 flex-shrink-0" />
                          : <Square size={16} className="text-slate-500 flex-shrink-0" />}
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.title}</span>
                        <span className="text-xs text-slate-500 ml-auto flex-shrink-0">₹{c.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={creating}
                className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl gradient-primary text-white hover:opacity-90 disabled:opacity-60">
                {creating && <Loader2 size={14} className="animate-spin" />} Create Bundle
              </button>
            </form>

            {myBundles.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Your Bundles</h2>
                <div className="space-y-2">
                  {myBundles.map((b) => (
                    <div key={b._id} className="glass rounded-xl border border-slate-900/[0.06] dark:border-white/[0.06] p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{b.title}</p>
                        <p className="text-xs text-slate-500">{b.courses.length} courses · ₹{b.price}</p>
                      </div>
                      <button
                        onClick={() => handlePublishToggle(b._id)}
                        className={`text-xs px-3 py-1.5 rounded-lg ${b.isPublished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900/10 dark:bg-white/10 text-slate-500'}`}
                      >
                        {b.isPublished ? 'Published' : 'Draft — Publish'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
