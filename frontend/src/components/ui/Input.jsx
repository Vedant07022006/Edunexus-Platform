import clsx from 'clsx';

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon size={16} />
          </span>
        )}
        <input
          className={clsx(
            'w-full glass border rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500',
            'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all',
            error ? 'border-red-500/50' : 'border-slate-900/10 dark:border-white/10',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
