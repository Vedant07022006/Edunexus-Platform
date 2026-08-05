import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, completeLoginWithOtp } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  // NEW — Phase 5: 2FA OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp]         = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await login(form);
      // NEW — Phase 5: account has 2FA enabled — show OTP step instead
      if (res.data.requiresOtp) {
        setOtpStep(true);
        toast.success('OTP sent to your email');
        return;
      }
      toast.success('Welcome back!');
      const role = res.data.user.role;
      navigate(role === 'instructor' ? '/instructor' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('verify')) navigate('/verify-otp', { state: { email: form.email } });
    } finally {
      setLoading(false);
    }
  };

  // NEW — Phase 5: completes login after entering the 2FA OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setOtpLoading(true);
    try {
      const res = await completeLoginWithOtp({ email: form.email, otp: otp.trim() });
      toast.success('Welcome back!');
      const role = res.data.user.role;
      navigate(role === 'instructor' ? '/instructor' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-surface-3 to-surface items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">EduNexus</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">The AI-powered learning platform<br />for the next generation.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {['AI Quizzes', 'Auto Transcripts', 'Progress Tracking', 'Expert Instructors'].map(f => (
              <div key={f} className="glass rounded-xl p-3 border border-slate-900/[0.06] dark:border-white/[0.06]">
                <p className="text-xs text-primary-300 font-medium">✓ {f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">EduNexus</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">Sign in to continue learning</p>

          {otpStep ? (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                <ShieldCheck size={16} className="text-primary-400" />
                Enter the 6-digit code sent to {form.email}
              </div>
              <Input label="OTP Code" placeholder="123456" value={otp}
                onChange={(e) => setOtp(e.target.value)} maxLength={6} />
              <Button type="submit" size="lg" className="w-full" loading={otpLoading}>
                Verify & Sign In
              </Button>
              <button type="button" onClick={() => setOtpStep(false)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white w-full text-center">
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" placeholder="you@example.com" icon={Mail}
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                error={errors.email} />
              <Input label="Password" type="password" placeholder="••••••••" icon={Lock}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                error={errors.password} />

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Sign In
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
