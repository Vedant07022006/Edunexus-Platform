import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resetPassword } from '../../services/api.service';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Lock, Zap, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token }    = useParams();
  const navigate     = useNavigate();

  const [form, setForm]         = useState({ newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [done, setDone]         = useState(false);
  const [tokenError, setTokenError] = useState('');

  // If no token in URL, show an immediate error
  useEffect(() => {
    if (!token) {
      setTokenError('Invalid or missing reset token. Please request a new reset link.');
    }
  }, [token]);

  const validate = () => {
    const e = {};
    if (form.newPassword.length < 8) {
      e.newPassword = 'Password must be at least 8 characters';
    }
    if (form.newPassword !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token, { newPassword: form.newPassword });
      setDone(true);
      toast.success('Password reset successfully!');
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. The link may have expired.';
      toast.error(msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setTokenError(msg);
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Token error state ─────────────────────────────────────────────────
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Link expired or invalid</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{tokenError}</p>
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full gradient-primary text-white text-sm font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-opacity text-center"
            >
              Request a new reset link
            </Link>
            <Link
              to="/login"
              className="block w-full text-center px-4 py-3 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password reset!</h2>
          <p className="text-slate-400 text-sm mb-8">
            Your password has been updated successfully.
            <br />
            Redirecting you to login in 3 seconds…
          </p>
          <Link
            to="/login"
            className="block w-full gradient-primary text-white text-sm font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-opacity text-center"
          >
            Sign in now
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────
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
          <p className="text-slate-400 text-lg">
            Create a new secure password<br />for your account.
          </p>
          <div className="mt-10 p-4 glass rounded-2xl border border-white/[0.06] text-left max-w-xs mx-auto space-y-2">
            {['At least 8 characters', 'Mix of letters & numbers', 'Different from old password'].map(tip => (
              <div key={tip} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">{tip}</p>
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

          <h2 className="text-3xl font-bold text-white mb-1">Set new password</h2>
          <p className="text-slate-400 text-sm mb-8">
            Choose a strong password for your EduNexus account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="relative">
              <Input
                label="New password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                value={form.newPassword}
                onChange={e => { setForm(p => ({ ...p, newPassword: e.target.value })); setErrors(p => ({ ...p, newPassword: '' })); }}
                error={errors.newPassword}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Input
                label="Confirm password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                value={form.confirmPassword}
                onChange={e => { setForm(p => ({ ...p, confirmPassword: e.target.value })); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                error={errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength indicator */}
            {form.newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i < getStrength(form.newPassword)
                          ? strengthColor(getStrength(form.newPassword))
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{strengthLabel(getStrength(form.newPassword))}</p>
              </div>
            )}

            {errors.form && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} /> {errors.form}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Reset Password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              Back to login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ── Password strength helpers ─────────────────────────────────────────────
function getStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function strengthColor(score) {
  return ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][score - 1] || 'bg-white/10';
}

function strengthLabel(score) {
  return ['', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';
}
