import { clsx } from 'clsx';

export function Input({ label, error, hint, className, containerClass, icon: Icon, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1', containerClass)}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <Icon size={14} />
          </span>
        )}
        <input
          className={clsx(
            'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]',
            'focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]',
            'transition-colors',
            Icon && 'pl-8',
            error && 'border-[var(--accent-red)] focus:border-[var(--accent-red)] focus:ring-[var(--accent-red)]',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, children, className, containerClass, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1', containerClass)}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)]',
          'focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]',
          'transition-colors cursor-pointer',
          error && 'border-[var(--accent-red)]',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className, containerClass, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1', containerClass)}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none',
          'focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]',
          'transition-colors',
          error && 'border-[var(--accent-red)]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
    </div>
  );
}
