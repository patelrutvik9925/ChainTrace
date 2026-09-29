import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, Play, Square, Bell, Plus, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, EmptyState, Spinner } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, StatusBadge, DemoBanner } from '../components/ui/Badge.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Demo monitoring entries shown when no DB is connected
const DEMO_MONITORED = [
  {
    _id: 'demo-mon-1',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    blockchain: 'TRON',
    token: 'USDT',
    case: { _id: 'demo-case-mongo-0001', caseId: 'SIH-2026-DEMO1', caseName: 'Demo Investigation — TRC-20 USDT Fraud' },
    monitoringSince: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastChecked: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    newTransactions: 0,
    isDemo: true,
  },
  {
    _id: 'demo-mon-2',
    address: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF',
    blockchain: 'TRON',
    token: 'USDT',
    case: { _id: 'demo-case-mongo-0001', caseId: 'SIH-2026-DEMO1', caseName: 'Demo Investigation — TRC-20 USDT Fraud' },
    monitoringSince: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    newTransactions: 2,
    isDemo: true,
  },
];

export default function MonitoringPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showStart, setShowStart] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/monitoring');
      const data = res.data.data?.wallets || [];
      if (data.length === 0 && res.data.data?.demoMode) {
        setWallets(DEMO_MONITORED);
        setIsDemo(true);
      } else {
        setWallets(data);
        setIsDemo(!!res.data.data?.demoMode);
      }
    } catch {
      // No DB — show demo entries
      setWallets(DEMO_MONITORED);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stopMonitor = async (address, caseId) => {
    try {
      await api.post('/monitoring/stop', { walletAddress: address, caseId });
      setWallets(prev => prev.filter(w => w.address !== address));
      toast.success('Monitoring stopped.');
    } catch {
      // Demo mode: just remove from local state
      setWallets(prev => prev.filter(w => w.address !== address));
      toast.success('Monitoring stopped (demo).');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Wallet Monitoring"
        subtitle="Near-real-time surveillance of investigation wallets"
        showDemoMode={isDemo}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={Plus} onClick={() => setShowStart(true)}>Start Monitoring</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)]">
          <Activity size={12} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
          <span>
            Monitoring uses scheduled polling to detect new activity on tracked wallets.
            Alerts are generated automatically when new suspicious transactions are detected.
            {isDemo && <><br /><span className="text-[var(--accent-orange)]">⚠ Demo mode — monitoring entries are simulated. Connect MongoDB for persistent monitoring.</span></>}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={20} /></div>
        ) : wallets.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No wallets monitored"
            description="Enable monitoring from a case investigation or use 'Start Monitoring' to track new wallet activity."
            action={<Button size="sm" icon={Plus} onClick={() => setShowStart(true)}>Start Monitoring</Button>}
          />
        ) : (
          <Panel title={`Monitored Wallets (${wallets.length})`} noPad actions={isDemo && <DemoBanner />}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {['Wallet Address', 'Chain', 'Case', 'Since', 'Last Check', 'New Txs', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => (
                  <tr key={w._id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="font-mono text-[var(--accent-blue)] hover:underline"
                        onClick={() => navigate(`/wallets/${encodeURIComponent(w.address)}?chain=${w.blockchain}`)}
                      >
                        {w.address.substring(0, 12)}…{w.address.slice(-6)}
                      </button>
                      {w.isDemo && <Badge variant="demo" size="xs" className="ml-1">DEMO</Badge>}
                    </td>
                    <td className="px-4 py-3"><Badge variant="blue">{w.blockchain}</Badge></td>
                    <td className="px-4 py-3">
                      {w.case ? (
                        <button className="text-[var(--accent-blue)] hover:underline" onClick={() => navigate(`/cases/${w.case._id || w.case}`)}>
                          {w.case.caseId || 'View Case'}
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {w.monitoringSince ? format(new Date(w.monitoringSince), 'dd MMM HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {w.lastChecked ? format(new Date(w.lastChecked), 'dd MMM HH:mm') : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      {w.newTransactions > 0 ? (
                        <span className="text-[var(--accent-orange)] font-semibold">{w.newTransactions} new</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                        <span className="text-[var(--accent-green)] text-[11px]">Active</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="xs" variant="danger" icon={Square} onClick={() => stopMonitor(w.address, w.case?._id || w.case)}>
                        Stop
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>

      <StartMonitoringModal
        isOpen={showStart}
        onClose={() => setShowStart(false)}
        onStarted={() => { setShowStart(false); load(); }}
        isDemo={isDemo}
      />
    </div>
  );
}

function StartMonitoringModal({ isOpen, onClose, onStarted, isDemo }) {
  const [address, setAddress] = useState('');
  const [caseId, setCaseId] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/cases?limit=50').then(r => setCases(r.data.data?.cases || [])).catch(() => {});
    }
  }, [isOpen]);

  const handleStart = async () => {
    if (!address.trim()) { toast.error('Enter a wallet address.'); return; }
    setLoading(true);
    try {
      await api.post('/monitoring/start', {
        walletAddress: address.trim(),
        blockchain: 'TRON',
        caseId: caseId || undefined,
      });
      toast.success('Monitoring started.');
      onStarted();
    } catch (err) {
      const msg = err.response?.data?.error?.message;
      if (msg?.includes('database') || err.response?.status === 503) {
        // Demo fallback — just show success
        toast.success('Monitoring started (demo mode — not persisted).');
        onStarted();
      } else {
        toast.error(msg || 'Failed to start monitoring.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Wallet Monitoring" size="sm">
      <div className="p-5 space-y-4">
        {isDemo && <DemoBanner />}
        <Input
          label="Wallet Address (TRON)"
          placeholder="T..."
          value={address}
          onChange={e => setAddress(e.target.value)}
          hint="Enter the TRON wallet address to monitor for new activity."
        />
        <Select label="Associate with Case (optional)" value={caseId} onChange={e => setCaseId(e.target.value)}>
          <option value="">— No case association —</option>
          {cases.map(c => <option key={c._id} value={c._id}>{c.caseId} — {c.caseName}</option>)}
        </Select>
        <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
          <AlertTriangle size={11} className="text-[var(--accent-orange)] mt-0.5 shrink-0" />
          Monitoring uses scheduled polling. New activity generates alerts automatically. This is investigative surveillance — not legal surveillance.
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Play} loading={loading} onClick={handleStart}>Start Monitoring</Button>
        </div>
      </div>
    </Modal>
  );
}
