import { clsx } from 'clsx';

export function Panel({ children, className, title, actions, noPad }) {
  return (
    <div className={clsx('panel', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  );
}

export function PanelRow({ label, value, valueClass, children }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-muted)] shrink-0 w-40">{label}</span>
      <span className={clsx('text-xs text-[var(--text-primary)] text-right break-all font-mono', valueClass)}>
        {children || value || '—'}
      </span>
    </div>
  );
}

export function Skeleton({ className, lines = 1 }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[var(--bg-overlay)] rounded animate-pulse" style={{ width: i % 2 === 0 ? '100%' : '75%' }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
          <Icon size={20} className="text-[var(--text-muted)]" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-xs text-[var(--text-muted)] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'An error occurred', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[#f8514910] flex items-center justify-center mb-4">
        <span className="text-[var(--accent-red)] text-xl">⚠</span>
      </div>
      <h3 className="text-sm font-semibold text-[var(--accent-red)] mb-1">{title}</h3>
      {description && <p className="text-xs text-[var(--text-muted)] max-w-xs mb-4">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-[var(--accent-blue)] hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Divider({ className }) {
  return <div className={clsx('border-t border-[var(--border-subtle)]', className)} />;
}

export function Spinner({ size = 16, className }) {
  return (
    <svg
      className={clsx('animate-spin text-[var(--accent-blue)]', className)}
      width={size} height={size}
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
