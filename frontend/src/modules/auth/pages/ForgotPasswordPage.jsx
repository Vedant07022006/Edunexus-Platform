import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forgotPassword } from '../../shared/services/api.service';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import { Mail, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({ email: email.trim().toLowerCase() });
      setSubmitted(true);
      toast.success('Reset link sent! Check your inbox.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset email';
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-surface-3 to-surface items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">EduNexus</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Forgot your password?<br />No worries, we've got you covered.
          </p>
          <div className="mt-10 p-4 glass rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.06] text-left max-w-xs mx-auto">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We'll send a secure password reset link to your registered email address. The link expires in <span className="text-primary-300 font-medium">15 minutes</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">EduNexus</span>
          </div>

          {!submitted ? (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 group"
              >
                <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                Back to login
              </Link>

              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Forgot password?</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">
                Enter your account email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  error={error}
                  autoComplete="email"
                  autoFocus
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={loading}
                >
                  Send Reset Link
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your inbox!</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                We've sent a password reset link to:
              </p>
              <p className="text-primary-300 font-medium mb-6">{email}</p>
              <p className="text-slate-500 text-xs mb-8 leading-relaxed">
                The link will expire in <span className="text-slate-700 dark:text-slate-300">15 minutes</span>.
                If you don't see it, check your spam folder.
              </p>

              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => { setSubmitted(false); setEmail(''); }}
                >
                  Try a different email
                </Button>
                <Link
                  to="/login"
                  className="block w-full text-center px-4 py-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
