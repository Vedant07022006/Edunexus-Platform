import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createCourse } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { BookOpen, DollarSign, Globe, Tag, Upload, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const LEVELS  = ['beginner', 'intermediate', 'advanced'];
const CATEGORIES = ['Development', 'Design', 'Business', 'Marketing', 'Data Science', 'DevOps', 'Other'];

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', level: 'beginner', language: 'English', tags: ''
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  const validate = () => {
    const e = {};
    if (form.title.length < 5) e.title = 'Title must be at least 5 characters';
    if (form.description.length < 20) e.description = 'Description must be at least 20 characters';
    if (!form.category) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFile = (file) => {
    if (!file) return;
    setThumbnail(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (thumbnail) fd.append('thumbnail', thumbnail);
      const { data } = await createCourse(fd);
      toast.success('Course created!');
      navigate(`/instructor/courses/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">Create New Course</h1>
          <p className="text-slate-400 text-sm mb-8">Share your knowledge with the world</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Course Thumbnail</label>
              <div
                onClick={() => document.getElementById('thumb-upload').click()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-white/20 rounded-2xl overflow-hidden cursor-pointer hover:border-primary-500/50 transition-colors"
              >
                {preview ? (
                  <img src={preview} alt="preview" className="w-full aspect-video object-cover" />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Upload size={32} />
                    <p className="text-sm">Click or drag to upload thumbnail</p>
                    <p className="text-xs">JPEG, PNG, WebP · Max 5MB</p>
                  </div>
                )}
              </div>
              <input id="thumb-upload" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Basic Info */}
            <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><BookOpen size={16} className="text-primary-400" /> Basic Information</h2>
              <Input label="Course Title" placeholder="e.g. Complete React Developer Bootcamp" icon={BookOpen}
                value={form.title} onChange={set('title')} error={errors.title} />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea rows={4} placeholder="Describe what students will learn..."
                  value={form.description} onChange={set('description')}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-all resize-none" />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                  <select value={form.category} onChange={set('category')}
                    className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white bg-transparent focus:outline-none focus:border-primary-500">
                    <option value="" className="bg-surface-3">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-3">{c}</option>)}
                  </select>
                  {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Level</label>
                  <select value={form.level} onChange={set('level')}
                    className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white bg-transparent focus:outline-none focus:border-primary-500 capitalize">
                    {LEVELS.map(l => <option key={l} value={l} className="bg-surface-3 capitalize">{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><DollarSign size={16} className="text-primary-400" /> Pricing & Language</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Price (₹) — leave 0 for free" type="number" min="0" icon={DollarSign}
                  placeholder="0" value={form.price} onChange={set('price')} />
                <Input label="Language" icon={Globe} placeholder="English"
                  value={form.language} onChange={set('language')} />
              </div>
              <Input label="Tags (comma-separated)" icon={Tag} placeholder="react, javascript, frontend"
                value={form.tags} onChange={set('tags')} />
            </div>

            <Button type="submit" size="xl" className="w-full" loading={loading}>
              Create Course
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
