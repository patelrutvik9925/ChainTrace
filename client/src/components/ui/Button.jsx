import { clsx } from 'clsx';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
  type = 'button',
  className,
  icon: Icon,
  iconRight: IconRight,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded cursor-pointer select-none whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)]';
  const variants = {
    primary: 'bg-[var(--accent-blue)] text-white hover:bg-[#1a7cff] active:bg-[#1066d8]',
    secondary: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-muted)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
    danger: 'bg-[#f8514920] text-[var(--accent-red)] border border-[#f8514940] hover:bg-[#f8514940]',
    success: 'bg-[#3fb95020] text-[var(--accent-green)] border border-[#3fb95040] hover:bg-[#3fb95030]',
    outline: 'bg-transparent text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)]',
  };
  const sizes = {
    xs: 'text-[11px] h-6 px-2',
    sm: 'text-xs h-7 px-3',
    md: 'text-sm h-8 px-4',
    lg: 'text-sm h-10 px-5',
    xl: 'text-base h-12 px-6',
  };
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(base, variants[variant], sizes[size], isDisabled && 'opacity-50 cursor-not-allowed', className)}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={size === 'xs' || size === 'sm' ? 12 : 14} />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight size={14} />}
    </button>
  );
}
