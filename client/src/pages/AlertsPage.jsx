import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, Filter, Network } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, EmptyState, Spinner } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, StatusBadge, SeverityBadge } from '../components/ui/Badge.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

export default function AlertsPage() {
  const navigate = useNavigate();
  const [allAlerts, setAllAlerts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('UNREAD');

  // Load ALL alerts once on mount — filter client-side so local state isn't overwritten
  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alerts?limit=100');
      setAllAlerts(res.data.data?.alerts || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Derive visible list and unread count from allAlerts
  const alerts = filter ? allAlerts.filter(a => a.status === filter) : allAlerts;
  const unreadCount = allAlerts.filter(a => a.status === 'UNREAD').length;

  const acknowledge = (id) => {
    // Update master allAlerts state immediately — derived `alerts` view updates automatically
    setAllAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    // Fire API in background; ignore failure (demo mode has no DB)
    api.patch(`/alerts/${id}/acknowledge`).catch(() => {});
  };

  const acknowledgeAll = () => {
    // Update all unread alerts in one state update
    setAllAlerts(prev => prev.map(a => a.status === 'UNREAD' ? { ...a, status: 'ACKNOWLEDGED' } : a));
    // Fire API calls in background; ignore failures
    allAlerts.filter(a => a.status === 'UNREAD').forEach(a => {
      api.patch(`/alerts/${a._id}/acknowledge`).catch(() => {});
    });
  };

  const SEVERITY_COLORS = {
    CRITICAL: 'bg-[#ff444420] border-l-[#ff4444]',
    HIGH: 'bg-[#f8514910] border-l-[#f85149]',
    MEDIUM: 'bg-[#d2992210] border-l-[#d29922]',
    LOW: 'bg-[#1f6feb10] border-l-[#388bfd]',
    INFO: 'bg-[var(--bg-elevated)] border-l-[var(--border-muted)]',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Alerts"
        subtitle={`${allAlerts.length} alert${allAlerts.length !== 1 ? 's' : ''} · ${unreadCount} unread`}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="secondary" icon={CheckCheck} onClick={acknowledgeAll}>
                Acknowledge All
              </Button>
            )}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {['', 'UNREAD', 'ACKNOWLEDGED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
            >
              {f || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={20} /></div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alerts"
            description={filter === 'UNREAD' ? 'No unread alerts. All clear.' : 'No alerts match this filter.'}
          />
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div
                key={a._id}
                className={`panel border-l-4 p-4 ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.INFO}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</span>
                      <SeverityBadge severity={a.severity} />
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">{a.message}</p>
                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                      <span>{format(new Date(a.createdAt), 'dd MMM yyyy HH:mm')}</span>
                      {a.wallet && (
                        <span className="font-mono">{a.wallet.substring(0, 12)}...</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(a.context?.caseId || a.case) && (
                      <Button size="xs" variant="ghost" icon={Network} onClick={() => navigate(`/cases/${a.context?.caseId || a.case}`)}>
                        View Case
                      </Button>
                    )}
                    {a.status === 'UNREAD' && (
                      <Button size="xs" variant="secondary" onClick={() => acknowledge(a._id)}>
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
