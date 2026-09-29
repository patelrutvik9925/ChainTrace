import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Bell, Activity, Network, ArrowRight, TrendingUp, Shield, AlertTriangle, Plus } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { RiskBadge, StatusBadge, Badge } from '../components/ui/Badge.jsx';
import { Spinner, EmptyState } from '../components/ui/Panel.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, sub, color = 'blue', onClick }) {
  const colors = {
    blue: { bg: 'bg-[#1f6feb15]', text: 'text-[var(--accent-blue)]' },
    green: { bg: 'bg-[#3fb95015]', text: 'text-[var(--accent-green)]' },
    orange: { bg: 'bg-[#d2992215]', text: 'text-[var(--accent-orange)]' },
    red: { bg: 'bg-[#f8514915]', text: 'text-[var(--accent-red)]' },
  };
  const c = colors[color];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 p-4 panel hover:bg-[var(--bg-elevated)] transition-colors text-left w-full"
    >
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div>
        <div className="text-xl font-bold text-[var(--text-primary)] leading-none mb-1">{value ?? '—'}</div>
        <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
        {sub && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</div>}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch each source independently — DB-dependent endpoints return 503 in demo mode
        const [statsRes, casesRes, alertsRes] = await Promise.allSettled([
          api.get('/system/stats'),
          api.get('/cases?limit=5'),
          api.get('/alerts?status=UNREAD&limit=5'),
        ]);
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data.data);
          if (statsRes.value.data.data?.demoMode) setDemoMode(true);
        }
        if (casesRes.status === 'fulfilled') {
          setCases(casesRes.value.data.data?.cases || []);
        } else {
          const s = casesRes.reason?.response?.status;
          if (s === 503 || s === 429 || !s) setDemoMode(true);
        }
        if (alertsRes.status === 'fulfilled') {
          setAlerts(alertsRes.value.data.data?.alerts || []);
        }
      } catch (err) {
        setError('Failed to load dashboard data. Ensure the server is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Investigation Overview" subtitle="Platform dashboard" />
      <div className="flex-1 flex items-center justify-center">
        <Spinner size={24} />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Investigation Overview"
        subtitle="Blockchain Fraud Investigation Platform"
        actions={
          <Button size="sm" icon={Plus} onClick={() => navigate('/cases/new')}>
            New Case
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {demoMode && (
          <div className="bg-[#d2992215] border border-[#d2992240] rounded px-4 py-3 flex items-center gap-3">
            <span className="text-[var(--accent-orange)] text-sm">⚠</span>
            <div>
              <span className="text-xs font-semibold text-[var(--accent-orange)]">DEMO MODE — No Database Connection</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">You are authenticated with demo credentials. Database features (cases, investigations, reports) are unavailable until MongoDB is connected.</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-[#f8514910] border border-[#f8514940] rounded px-4 py-3 text-sm text-[var(--accent-red)] flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FolderOpen} label="Total Cases" value={stats?.cases} color="blue" onClick={() => navigate('/cases')} />
          <StatCard icon={Network} label="Investigations" value={stats?.investigations} color="green" onClick={() => navigate('/cases')} />
          <StatCard icon={Bell} label="Unread Alerts" value={stats?.unreadAlerts} color="red" onClick={() => navigate('/alerts')} />
          <StatCard icon={Activity} label="Wallets Tracked" value={stats?.wallets} color="orange" onClick={() => navigate('/monitoring')} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Cases */}
          <Panel title="Recent Cases" actions={
            <Button size="xs" variant="ghost" onClick={() => navigate('/cases')}>View all →</Button>
          }>
            {cases.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No cases yet"
                description="Create your first investigation case to get started."
                action={<Button size="sm" icon={Plus} onClick={() => navigate('/cases/new')}>Create Case</Button>}
              />
            ) : (
              <div className="space-y-2">
                {cases.map(c => (
                  <button
                    key={c._id}
                    onClick={() => navigate(`/cases/${c._id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[var(--bg-elevated)] transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">{c.caseName}</span>
                        {c.isDemo && <Badge variant="demo" size="xs">DEMO</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">{c.caseId}</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {format(new Date(c.createdAt), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RiskBadge level={c.priority} />
                      <StatusBadge status={c.status} />
                      <ArrowRight size={12} className="text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {/* Recent Alerts */}
          <Panel title="Recent Alerts" actions={
            <Button size="xs" variant="ghost" onClick={() => navigate('/alerts')}>View all →</Button>
          }>
            {alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No active alerts"
                description="Alerts will appear here when monitoring detects suspicious activity."
              />
            ) : (
              <div className="space-y-2">
                {alerts.map(a => (
                  <button
                    key={a._id}
                    onClick={() => navigate(`/alerts`)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded hover:bg-[var(--bg-elevated)] transition-colors text-left"
                  >
                    <div className="mt-0.5">
                      <AlertTriangle size={13} className={
                        a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'text-[var(--accent-red)]'
                        : a.severity === 'MEDIUM' ? 'text-[var(--accent-orange)]'
                        : 'text-[var(--accent-blue)]'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">{a.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{a.message}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {format(new Date(a.createdAt), 'dd MMM HH:mm')}
                      </div>
                    </div>
                    <RiskBadge level={a.severity === 'CRITICAL' ? 'CRITICAL' : a.severity} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Quick Actions */}
        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'New Investigation', icon: FolderOpen, to: '/cases/new', color: 'var(--accent-blue)' },
              { label: 'Graph Workspace', icon: Network, to: '/graph', color: 'var(--accent-purple)' },
              { label: 'VASP Intelligence', icon: Shield, to: '/vasp', color: 'var(--accent-green)' },
              { label: 'Generate Report', icon: TrendingUp, to: '/reports', color: 'var(--accent-orange)' },
            ].map(({ label, icon: Icon, to, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)] transition-colors group"
              >
                <Icon size={18} style={{ color }} />
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
