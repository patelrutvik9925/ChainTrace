import { clsx } from 'clsx';

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', size = 'sm', className }) {
  const variants = {
    default: 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    blue: 'bg-[#1f6feb40] text-[var(--accent-blue)] border border-[#388bfd40]',
    green: 'bg-[#3fb95020] text-[var(--accent-green)] border border-[#3fb95040]',
    red: 'bg-[#f8514920] text-[var(--accent-red)] border border-[#f8514940]',
    orange: 'bg-[#d2992220] text-[var(--accent-orange)] border border-[#d2992240]',
    purple: 'bg-[#bc8cff20] text-[var(--accent-purple)] border border-[#bc8cff40]',
    critical: 'bg-[#ff444420] text-[#ff4444] border border-[#ff444440]',
    demo: 'bg-[#d29922] text-[#0d1117] border-0 font-semibold',
  };
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };
  return (
    <span className={clsx('inline-flex items-center rounded font-medium tracking-wide uppercase', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

// ── Risk Badge ─────────────────────────────────────────────────────────────────
export function RiskBadge({ level, className }) {
  const map = {
    LOW: { variant: 'green', label: 'LOW' },
    MEDIUM: { variant: 'orange', label: 'MEDIUM' },
    HIGH: { variant: 'red', label: 'HIGH' },
    CRITICAL: { variant: 'critical', label: 'CRITICAL' },
  };
  const { variant, label } = map[level] || { variant: 'default', label: level || 'UNKNOWN' };
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

// ── Status Badge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status, className }) {
  const map = {
    OPEN: { variant: 'blue', label: 'Open' },
    ACTIVE: { variant: 'green', label: 'Active' },
    UNDER_REVIEW: { variant: 'orange', label: 'Under Review' },
    PENDING_VASP: { variant: 'purple', label: 'Pending VASP' },
    ESCALATED: { variant: 'red', label: 'Escalated' },
    CLOSED: { variant: 'default', label: 'Closed' },
    ARCHIVED: { variant: 'default', label: 'Archived' },
    // Investigation statuses
    INITIALIZING: { variant: 'blue', label: 'Initializing' },
    COLLECTING: { variant: 'blue', label: 'Collecting' },
    TRACING: { variant: 'orange', label: 'Tracing' },
    ANALYZING: { variant: 'orange', label: 'Analyzing' },
    COMPLETE: { variant: 'green', label: 'Complete' },
    ERROR: { variant: 'red', label: 'Error' },
    PAUSED: { variant: 'default', label: 'Paused' },
    // Alert statuses
    UNREAD: { variant: 'red', label: 'Unread' },
    READ: { variant: 'default', label: 'Read' },
    ACKNOWLEDGED: { variant: 'green', label: 'Acknowledged' },
    DISMISSED: { variant: 'default', label: 'Dismissed' },
  };
  const { variant, label } = map[status] || { variant: 'default', label: status || '—' };
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

// ── Severity Badge ─────────────────────────────────────────────────────────────
export function SeverityBadge({ severity, className }) {
  const map = {
    CRITICAL: 'critical',
    HIGH: 'red',
    MEDIUM: 'orange',
    LOW: 'blue',
    INFO: 'default',
  };
  return <Badge variant={map[severity] || 'default'} className={className}>{severity}</Badge>;
}

// ── Confidence Badge ───────────────────────────────────────────────────────────
export function ConfidenceBadge({ level, className }) {
  const map = {
    HIGH: 'green',
    MEDIUM: 'orange',
    LOW: 'default',
    INSUFFICIENT: 'red',
  };
  return <Badge variant={map[level] || 'default'} className={className}>{level || '—'} CONFIDENCE</Badge>;
}

// ── Demo Mode Banner ───────────────────────────────────────────────────────────
export function DemoBanner({ className }) {
  return (
    <span className={clsx('demo-banner', className)}>
      ⚠ DEMO DATA — NOT LIVE BLOCKCHAIN
    </span>
  );
}
