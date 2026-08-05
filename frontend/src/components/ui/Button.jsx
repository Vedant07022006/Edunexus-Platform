import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  primary: 'gradient-primary text-white hover:opacity-90 glow-sm',
  secondary: 'glass-strong text-slate-900 dark:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 border border-slate-900/10 dark:border-white/10',
  ghost: 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5',
  danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-base rounded-2xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={clsx(
        'font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
