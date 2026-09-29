import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Settings, HelpCircle, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../features/auth/authStore.js';
import { DemoBanner } from './ui/Badge.jsx';

export function TopBar({ title, subtitle, actions, showDemoMode = false, alertCount = 0 }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{title}</h1>
          {subtitle && <p className="text-[10px] text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {showDemoMode && <DemoBanner />}
      </div>

      {/* Right: Actions + tools */}
      <div className="flex items-center gap-1">
        {actions}

        {/* Global search */}
        {searchOpen ? (
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => { setSearchOpen(false); setSearchQuery(''); }}
            placeholder="Search wallets, cases, hashes..."
            className="text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] w-72 focus:outline-none focus:border-[var(--accent-blue)]"
          />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Search size={13} />
            <span className="hidden lg:inline">Search</span>
          </button>
        )}

        {/* Alerts */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative flex items-center px-2 py-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Bell size={14} />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent-red)] rounded-full" />
          )}
        </button>

        {/* System status dot */}
        <div className="flex items-center gap-1.5 px-2 text-[10px] text-[var(--text-muted)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" />
          <span className="hidden xl:inline">Online</span>
        </div>
      </div>
    </header>
  );
}
