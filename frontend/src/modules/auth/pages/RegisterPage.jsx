import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { registerUser } from '../../shared/services/api.service';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import { Mail, Lock, User, Zap, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const roles = [
  { value: 'student', icon: GraduationCap, label: 'Student', desc: 'I want to learn' },
  { value: 'instructor', icon: BookOpen, label: 'Instructor', desc: 'I want to teach' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ fullName: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(form);
      toast.success('OTP sent to your email!');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl gradient-text">EduNexus</span>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Create your account</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">Join thousands of learners worldwide</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {roles.map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(p => ({ ...p, role: value }))}
              className={`p-4 rounded-xl border text-left transition-all ${
                form.role === value
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-slate-900/10 dark:border-white/10 glass hover:border-slate-900/15 dark:hover:border-white/20'
              }`}
            >
              <Icon size={20} className={form.role === value ? 'text-primary-400' : 'text-slate-500'} />
              <p className={`mt-2 text-sm font-medium ${form.role === value ? 'text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" icon={User}
            value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            error={errors.fullName} />
          <Input label="Email" type="email" placeholder="you@example.com" icon={Mail}
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            error={errors.email} />
          <Input label="Password" type="password" placeholder="Min 8 characters" icon={Lock}
            value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            error={errors.password} />

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
