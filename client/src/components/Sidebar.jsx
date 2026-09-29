import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, FolderOpen, Search, Bell, Activity,
  ShieldAlert, FileText, Settings, LogOut, ChevronRight,
  Network, Users, Database, Wallet, ArrowLeftRight, Building2,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/authStore.js';
import { Badge } from './ui/Badge.jsx';

const navSections = [
  {
    label: 'INVESTIGATION',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard, label: 'Overview' },
      { to: '/cases',           icon: FolderOpen,      label: 'Cases' },
      { to: '/wallets/intake',  icon: Wallet,          label: 'Add Wallet' },
      { to: '/search',          icon: Search,          label: 'Search' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/graph',        icon: Network,         label: 'Graph Workspace' },
      { to: '/transactions', icon: ArrowLeftRight,   label: 'Transactions' },
      { to: '/alerts',       icon: Bell,             label: 'Alerts', badge: 'new' },
      { to: '/monitoring',   icon: Activity,         label: 'Monitoring' },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/vasp',        icon: Database,    label: 'VASP Intelligence' },
      { to: '/reports',     icon: FileText,    label: 'Reports' },
      { to: '/audit',       icon: ShieldAlert, label: 'Audit Trail' },
      { to: '/integration', icon: Building2,   label: 'LEA / NCRP' },
    ],
  },
];

export function Sidebar({ alertCount = 0 }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <aside className="w-56 shrink-0 h-screen flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)]">
      {/* Logo / Identity */}
      <div className="px-4 pt-5 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-[var(--accent-blue)] flex items-center justify-center shrink-0">
            <Network size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">ChainTrace</div>
            <div className="text-[10px] text-[var(--text-muted)] leading-tight">SIH26183</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-2 mb-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                      )
                    }
                  >
                    <Icon size={14} />
                    <span className="flex-1">{label}</span>
                    {badge === 'new' && alertCount > 0 && (
                      <span className="text-[10px] bg-[var(--accent-red)] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {alertCount > 9 ? '9+' : alertCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-[var(--border-subtle)] px-3 py-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[var(--accent-blue)]">
              {user?.fullName?.[0] || user?.username?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.fullName || user?.username}</div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[#f8514910] transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
