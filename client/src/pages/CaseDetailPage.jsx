import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Network, Activity, Bell, FileText, Shield, AlertTriangle,
  ChevronRight, Play, Eye, Plus, Copy, CheckCheck, ExternalLink, Wallet,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, PanelRow, Spinner, EmptyState, Skeleton } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, StatusBadge, DemoBanner, SeverityBadge, ConfidenceBadge } from '../components/ui/Badge.jsx';
import { Tabs } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

function WalletBadgeType({ type }) {
  const map = {
    REPORTED_SUSPECT: { label: 'Reported Suspect', v: 'red' },
    INTERMEDIARY: { label: 'Intermediary', v: 'orange' },
    MULE: { label: 'Possible Mule', v: 'orange' },
    VASP_DEPOSIT: { label: 'Possible VASP Deposit', v: 'purple' },
    VASP_OMNIBUS: { label: 'VASP Omnibus', v: 'purple' },
    MIXER_PRIVACY: { label: 'Mixer/Privacy', v: 'red' },
    UNKNOWN: { label: 'Unknown', v: 'default' },
  };
  const { label, v } = map[type] || { label: type, v: 'default' };
  return <Badge variant={v}>{label}</Badge>;
}

function CopyAddress({ address }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors ml-1">
      {copied ? <CheckCheck size={11} className="text-[var(--accent-green)]" /> : <Copy size={11} />}
    </button>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseDoc, setCaseDoc] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [findings, setFindings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [startingInv, setStartingInv] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const caseRes = await api.get(`/cases/${id}`);
      const c = caseRes.data.data.case;
      setCaseDoc(c);

      const [invRes, alertRes] = await Promise.allSettled([
        api.get(`/investigations?caseId=${c._id}`),
        api.get(`/alerts?caseId=${c._id}&limit=10`),
      ]);
      const invs = invRes.status === 'fulfilled' ? (invRes.value.data.data?.investigations || []) : [];
      const latestInv = invs[0];
      setInvestigation(latestInv);
      setAlerts(alertRes.status === 'fulfilled' ? (alertRes.value.data.data?.alerts || []) : []);

      if (latestInv) {
        const [walletsRes, findingsRes] = await Promise.allSettled([
          api.get(`/wallets?caseId=${c._id}`),
          api.get(`/investigations/${latestInv._id}/findings`),
        ]);
        setWallets(walletsRes.status === 'fulfilled' ? (walletsRes.value.data.data?.wallets || []) : []);
        setFindings(findingsRes.status === 'fulfilled' ? (findingsRes.value.data.data?.findings || []) : []);
      }
    } catch (err) {
      setError('Failed to load case details. ' + (err.response?.data?.error?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const startInvestigation = async () => {
    if (!caseDoc?.victimInfo?.reportedWallet) {
      setError('No reported wallet address on this case. Add one before starting investigation.');
      return;
    }
    setStartingInv(true);
    try {
      const res = await api.post('/investigations/start', {
        caseId: caseDoc._id,
        rootWallet: caseDoc.victimInfo.reportedWallet,
        blockchain: caseDoc.victimInfo.blockchain || 'TRON',
        token: 'USDT',
        tracingDepth: 3,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to start investigation.');
    } finally {
      setStartingInv(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Case Details" />
      <div className="flex-1 flex items-center justify-center"><Spinner size={24} /></div>
    </div>
  );

  if (!caseDoc) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Case Not Found" />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Case not found or access denied.</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'wallets', label: 'Wallets', count: wallets.length },
    { id: 'findings', label: 'Findings', count: findings.length },
    { id: 'alerts', label: 'Alerts', count: alerts.filter(a => a.status === 'UNREAD').length },
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title={caseDoc.caseName}
        subtitle={caseDoc.caseId}
        showDemoMode={caseDoc.isDemo}
        actions={
          <div className="flex items-center gap-2">
            {investigation && (
              <Button size="sm" variant="secondary" icon={Network} onClick={() => navigate(`/graph?caseId=${caseDoc._id}&invId=${investigation._id}`)}>
                Open Graph
              </Button>
            )}
            {!investigation ? (
              <Button size="sm" icon={Play} loading={startingInv} onClick={startInvestigation}>
                Start Investigation
              </Button>
            ) : investigation.status !== 'COMPLETE' ? (
              <Button size="sm" icon={Play} loading={startingInv} onClick={startInvestigation}>
                Re-Investigate
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={FileText} onClick={() => navigate(`/reports?caseId=${caseDoc._id}&invId=${investigation._id}`)}>
                Generate Report
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mx-4 mt-3 text-xs text-[var(--accent-red)] bg-[#f8514910] border border-[#f8514940] rounded px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-4 shrink-0" />

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Case Info */}
              <div className="lg:col-span-2 space-y-4">
                <Panel title="Case Information">
                  <div className="divide-y divide-[var(--border-subtle)]">
                    <PanelRow label="Case ID" value={caseDoc.caseId} />
                    <PanelRow label="Status"><StatusBadge status={caseDoc.status} /></PanelRow>
                    <PanelRow label="Priority"><RiskBadge level={caseDoc.priority} /></PanelRow>
                    <PanelRow label="Created By" value={caseDoc.createdBy?.fullName || '—'} />
                    <PanelRow label="Assigned To" value={caseDoc.assignedTo?.fullName || '—'} />
                    <PanelRow label="Created" value={format(new Date(caseDoc.createdAt), 'dd MMM yyyy HH:mm')} />
                    {caseDoc.isDemo && <PanelRow label="Data Type"><DemoBanner /></PanelRow>}
                  </div>
                </Panel>

                <Panel title="Victim-Reported Information">
                  <div className="divide-y divide-[var(--border-subtle)]">
                    <PanelRow label="Reported Wallet">
                      <span className="font-mono text-[10px] text-[var(--accent-blue)]">
                        {caseDoc.victimInfo?.reportedWallet || '—'}
                        {caseDoc.victimInfo?.reportedWallet && <CopyAddress address={caseDoc.victimInfo.reportedWallet} />}
                      </span>
                    </PanelRow>
                    <PanelRow label="Blockchain" value={caseDoc.victimInfo?.blockchain} />
                    <PanelRow label="Asset" value={caseDoc.victimInfo?.asset} />
                    <PanelRow label="Estimated Loss" value={caseDoc.victimInfo?.estimatedLoss ? `${caseDoc.victimInfo.estimatedLoss} ${caseDoc.victimInfo.currency || 'USDT'}` : '—'} />
                    <PanelRow label="NCRP Reference" value={caseDoc.victimInfo?.ncrbComplaintNumber || '—'} />
                    <PanelRow label="Report Date" value={caseDoc.victimInfo?.reportDate ? format(new Date(caseDoc.victimInfo.reportDate), 'dd MMM yyyy') : '—'} />
                  </div>
                </Panel>
              </div>

              {/* Investigation Summary */}
              <div className="space-y-4">
                {investigation ? (
                  <Panel title="Investigation Summary">
                    <div className="divide-y divide-[var(--border-subtle)]">
                      <PanelRow label="Status"><StatusBadge status={investigation.status} /></PanelRow>
                      <PanelRow label="Risk Level"><RiskBadge level={investigation.summary?.riskLevel} /></PanelRow>
                      <PanelRow label="Wallets Analyzed" value={investigation.summary?.totalWallets} />
                      <PanelRow label="Transactions" value={investigation.summary?.totalTransactions} />
                      <PanelRow label="Hops Traced" value={investigation.progress?.hopsTraced} />
                      <PanelRow label="Patterns Detected" value={investigation.summary?.patternsFound} />
                      <PanelRow label="Possible VASPs" value={investigation.summary?.possibleVasps} />
                    </div>
                    {investigation.summary?.riskIndicators?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <p className="text-[10px] text-[var(--text-muted)] mb-2 uppercase tracking-wide">Risk Indicators</p>
                        <div className="flex flex-wrap gap-1.5">
                          {investigation.summary.riskIndicators.map(r => (
                            <span key={r} className="text-[10px] px-1.5 py-0.5 bg-[#f8514910] text-[var(--accent-red)] rounded border border-[#f8514930]">{r.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Panel>
                ) : (
                  <Panel title="Investigation">
                    <div className="py-4 text-center">
                      <p className="text-xs text-[var(--text-muted)] mb-3">No investigation started yet.</p>
                      <Button size="sm" icon={Play} loading={startingInv} onClick={startInvestigation}>
                        Start Investigation
                      </Button>
                    </div>
                  </Panel>
                )}

                {findings.length > 0 && (
                  <Panel title="Key Findings">
                    <div className="space-y-2">
                      {findings.slice(0, 3).map(f => (
                        <div key={f._id} className="p-2.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-[var(--text-primary)]">{f.title}</span>
                            <SeverityBadge severity={f.severity} />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{f.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <Panel
              title={`Wallets (${wallets.length})`}
              noPad
              actions={
                <Button
                  size="xs"
                  icon={Plus}
                  onClick={() => navigate(`/wallets/intake?caseId=${caseDoc._id}`)}
                >
                  Add Wallet
                </Button>
              }
            >
              {wallets.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No wallets tracked"
                  description="Add a victim-reported or suspect wallet address to begin investigation."
                  action={
                    <Button size="sm" icon={Plus} onClick={() => navigate(`/wallets/intake?caseId=${caseDoc._id}`)}>
                      Add Wallet
                    </Button>
                  }
                />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      {['Address', 'Chain', 'Classification', 'Risk', 'Hop', 'VASP Attribution', 'Tx Count'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map(w => (
                      <tr key={w._id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              className="font-mono text-[var(--accent-blue)] hover:underline text-xs"
                              onClick={() => navigate(`/wallets/${encodeURIComponent(w.address)}?chain=${w.blockchain || 'TRON'}`)}
                            >
                              {w.address.substring(0, 10)}…{w.address.slice(-6)}
                            </button>
                            <CopyAddress address={w.address} />
                          </div>
                          {w.isOriginalReported && <Badge variant="red" size="xs" className="mt-0.5">Reported</Badge>}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{w.blockchain}</td>
                        <td className="px-4 py-3"><WalletBadgeType type={w.classification} /></td>
                        <td className="px-4 py-3"><RiskBadge level={w.riskLevel} /></td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{w.hopDepth ?? '—'}</td>
                        <td className="px-4 py-3">
                          {w.vaspAttribution?.vaspName ? (
                            <div>
                              <span className="text-[var(--accent-purple)] text-[11px]">{w.vaspAttribution.vaspName}</span>
                              <ConfidenceBadge level={w.vaspAttribution.confidence} className="mt-0.5" />
                            </div>
                          ) : <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{w.stats?.transactionCount || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          )}

          {activeTab === 'findings' && (
            <div className="space-y-3">
              {findings.length === 0 ? (
                <EmptyState icon={Shield} title="No findings yet" description="Run an investigation to detect suspicious patterns." />
              ) : findings.map(f => (
                <Panel key={f._id}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{f.findingType?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      {f.confidence?.level && <ConfidenceBadge level={f.confidence.level} />}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">{f.explanation}</p>
                  {f.evidence?.observations?.length > 0 && (
                    <div className="bg-[var(--bg-elevated)] rounded p-3 mb-3">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">Supporting Observations</p>
                      <ul className="space-y-1">
                        {f.evidence.observations.map((o, i) => (
                          <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                            <span className="text-[var(--accent-green)] mt-0.5">•</span> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {f.evidence?.limitations && (
                    <p className="text-[10px] text-[var(--accent-orange)] bg-[#d2992215] rounded px-2 py-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={10} /> {f.evidence.limitations}
                    </p>
                  )}
                </Panel>
              ))}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <EmptyState icon={Bell} title="No alerts" description="Alerts will appear when monitoring detects new activity." />
              ) : alerts.map(a => (
                <div key={a._id} className="panel p-3 flex items-start gap-3">
                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'bg-[var(--accent-red)]' : a.severity === 'MEDIUM' ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-blue)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{a.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SeverityBadge severity={a.severity} />
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{a.message}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{format(new Date(a.createdAt), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <AuditTab caseId={caseDoc._id} />
          )}
        </div>
      </div>
    </div>
  );
}

function AuditTab({ caseId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/audit?caseId=${caseId}&limit=30`)
      .then(r => setLogs(r.data.data?.logs || []))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <div className="flex justify-center py-8"><Spinner size={18} /></div>;

  return (
    <Panel title="Audit Trail" noPad>
      {logs.length === 0 ? (
        <EmptyState icon={FileText} title="No audit records" description="Actions on this case will be recorded here." />
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {['Time', 'Action', 'User', 'Object', 'Result'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id} className="border-b border-[var(--border-subtle)] last:border-0">
                <td className="px-4 py-2.5 text-[var(--text-muted)] whitespace-nowrap">{format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}</td>
                <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{log.action?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{log.username || '—'}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono">{log.objectId || '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={log.result === 'SUCCESS' ? 'green' : log.result === 'FAILURE' ? 'red' : 'orange'}>{log.result}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
