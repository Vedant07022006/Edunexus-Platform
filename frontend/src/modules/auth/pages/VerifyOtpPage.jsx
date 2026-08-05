import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verifyEmailOtp, resendOtp } from '../../shared/services/api.service';
import Button from '../../shared/components/Button';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyOtpPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = location.state?.email || '';
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d)) handleVerify(next.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').slice(0, 6).split('');
    const next = [...otp];
    pasted.forEach((c, i) => { if (/\d/.test(c)) next[i] = c; });
    setOtp(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      await verifyEmailOtp({ email, otp: code || otp.join('') });
      toast.success('Email verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtp({ email });
      toast.success('OTP resent!');
      setCountdown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resend failed');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 glow">
          <Mail size={28} className="text-white" />
        </div>

        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Verify your email</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">We sent a 6-digit code to</p>
        <p className="text-primary-300 font-medium mb-8">{email}</p>

        <div className="flex justify-center gap-3 mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-bold glass border border-slate-900/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
            />
          ))}
        </div>

        <Button
          size="lg"
          className="w-full"
          loading={loading}
          onClick={() => handleVerify()}
          disabled={otp.some(d => !d)}
        >
          Verify Email
        </Button>

        <p className="mt-6 text-sm text-slate-500">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
