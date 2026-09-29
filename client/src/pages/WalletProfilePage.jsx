/**
 * WalletProfilePage — Stage 4: Wallet Intelligence Profile
 *
 * Displays intelligence analysis for a single wallet address.
 * Classifications are analytical findings — NOT definitive facts about a person.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Copy, CheckCheck, ExternalLink, Network, ArrowLeft,
  AlertTriangle, ChevronRight, Activity, Shield,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, PanelRow, Spinner, EmptyState } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, ConfidenceBadge, DemoBanner } from '../components/ui/Badge.jsx';
import { Tabs } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

// ── Classification display ────────────────────────────────────────────────────
const CLASSIFICATION_MAP = {
  REPORTED_SUSPECT:   { label: 'Reported Suspect',        variant: 'red',     note: 'Original wallet address as reported by victim.' },
  INTERMEDIARY:       { label: 'Possible Intermediary',   variant: 'orange',  note: 'Analytical finding — may transit funds between wallets.' },
  MULE:               { label: 'Possible Mule Wallet',    variant: 'orange',  note: 'Analytical finding — behavioral indicators of mule activity.' },
  VASP_DEPOSIT:       { label: 'Possible VASP Deposit',   variant: 'purple',  note: 'Analytical finding — behavioral indicators suggest possible exchange deposit.' },
  VASP_OMNIBUS:       { label: 'Possible VASP Omnibus',   variant: 'purple',  note: 'Analytical finding — possible exchange omnibus wallet.' },
  MIXER_PRIVACY:      { label: 'Mixer / Privacy Service', variant: 'red',     note: 'Analytical finding — possible interaction with privacy service.' },
  UNKNOWN:            { label: 'Unknown',                 variant: 'default', note: 'Insufficient data to classify this wallet.' },
  FRAUD_SOURCE:       { label: 'Possible Fraud Source',   variant: 'red',     note: 'Analytical finding — high-confidence fraud-linked indicators.' },
};

function ClassificationBadge({ classification }) {
  const m = CLASSIFICATION_MAP[classification] || { label: classification, variant: 'default', note: '' };
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={m.variant}>{m.label}</Badge>
      {m.note && <span className="text-[10px] text-[var(--text-muted)]">{m.note}</span>}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <button onClick={copy} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors">
      {copied ? <CheckCheck size={11} className="text-[var(--accent-green)]" /> : <Copy size={11} />}
    </button>
  );
}

export default function WalletProfilePage() {
  const { address } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chain = searchParams.get('chain') || 'TRON';

  const [wallet, setWallet]   = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectData, setCollectData] = useState(null);
  const [storedTxs, setStoredTxs] = useState([]);
  const [txsLoading, setTxsLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError('');
    Promise.allSettled([
      api.get(`/wallets/${encodeURIComponent(address)}`),
      api.get(`/wallets/profile/${encodeURIComponent(address)}?chain=${chain}`),
    ]).then(([walletRes, profileRes]) => {
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data.data?.wallet || null);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.data?.profile || null);
      if (walletRes.status === 'rejected' && profileRes.status === 'rejected') {
        setError('Wallet not found or could not be loaded.');
      }
    }).finally(() => setLoading(false));
  }, [address, chain]);

  const fetchBlockchainData = async () => {
    setCollectLoading(true);
    try {
      // Use the new Stage 5 collect endpoint — returns normalized transactions with full provenance
      const res = await api.post('/transactions/collect', { address, chain, token: 'USDT' });
      setCollectData(res.data.data);
      // Also refresh stored list
      loadStoredTransactions();
    } catch {
      setCollectData(null);
    } finally {
      setCollectLoading(false);
    }
  };

  const loadStoredTransactions = async () => {
    setTxsLoading(true);
    try {
      const res = await api.get(`/transactions?address=${encodeURIComponent(address)}&chain=${chain}&limit=100`);
      setStoredTxs(res.data.data?.transactions || []);
    } catch {
      setStoredTxs([]);
    } finally {
      setTxsLoading(false);
    }
  };

  const displayData = wallet || profile;

  const allTransactions = collectData?.transactions || storedTxs || profile?.transactions || [];
  const tabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'transactions', label: 'Transactions', count: allTransactions.length || undefined },
    { id: 'connections',  label: 'Connections' },
  ];

  if (loading) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Wallet Profile" />
      <div className="flex-1 flex items-center justify-center"><Spinner size={24} /></div>
    </div>
  );

  if (error || !displayData) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Wallet Profile" />
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={Network}
          title="Wallet Not Found"
          description={error || 'This address is not currently tracked in any investigation.'}
          action={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Go Back</Button>}
        />
      </div>
    </div>
  );

  const addrDisplay = address ? `${address.substring(0, 12)}…${address.slice(-8)}` : '—';
  const isDemo = displayData.isDemo || wallet?.isDemo;
  const classification = wallet?.classification || profile?.classification || 'UNKNOWN';
  const riskLevel = wallet?.riskLevel || profile?.riskLevel || 'MEDIUM';
  const vaspAttribution = wallet?.vaspAttribution || profile?.vaspAttribution;
  const stats = wallet?.stats || profile?.stats || {};
  const transactions = collectData?.transfers || profile?.transactions || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title={`Wallet: ${addrDisplay}`}
        subtitle={chain}
        showDemoMode={isDemo}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={Activity} loading={collectLoading} onClick={fetchBlockchainData}>
              Fetch Data
            </Button>
            {wallet?.case && (
              <Button size="sm" icon={ChevronRight} onClick={() => navigate(`/cases/${typeof wallet.case === 'object' ? wallet.case._id : wallet.case}`)}>
                Open Case
              </Button>
            )}
          </div>
        }
      />

      {/* Analytical disclaimer */}
      <div className="mx-4 mt-3 flex items-center gap-2 p-2.5 rounded border border-[var(--accent-orange)]/25 bg-[var(--accent-orange)]/5 text-[11px] text-[var(--text-muted)]">
        <AlertTriangle size={12} className="text-[var(--accent-orange)] shrink-0" />
        Classifications are analytical investigative findings with confidence levels. A wallet address does not identify a real-world person.
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-4 mt-3 shrink-0" />

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Wallet Identity">
                <div className="divide-y divide-[var(--border-subtle)]">
                  <PanelRow label="Wallet Address">
                    <span className="font-mono text-[10px] text-[var(--accent-blue)] flex items-center gap-1.5">
                      {address}
                      <CopyBtn text={address} />
                    </span>
                  </PanelRow>
                  <PanelRow label="Blockchain" value={wallet?.blockchain || chain} />
                  <PanelRow label="Asset / Token" value={wallet?.token || 'USDT'} />
                  <PanelRow label="Hop Depth" value={wallet?.hopDepth !== undefined ? String(wallet.hopDepth) : '—'} />
                  {wallet?.isOriginalReported && (
                    <PanelRow label="Evidence Role">
                      <Badge variant="red">Victim-Reported Suspect Address</Badge>
                    </PanelRow>
                  )}
                  {isDemo && (
                    <PanelRow label="Data Type"><DemoBanner /></PanelRow>
                  )}
                </div>
              </Panel>

              <Panel title="On-Chain Statistics">
                <div className="divide-y divide-[var(--border-subtle)]">
                  <PanelRow label="Transaction Count" value={String(stats.transactionCount ?? '—')} />
                  <PanelRow label="Total Received" value={stats.totalReceived ? `${parseFloat(stats.totalReceived).toLocaleString()} USDT` : '—'} />
                  <PanelRow label="Total Sent" value={stats.totalSent ? `${parseFloat(stats.totalSent).toLocaleString()} USDT` : '—'} />
                  <PanelRow label="First Seen" value={stats.firstSeen ? format(new Date(stats.firstSeen), 'dd MMM yyyy HH:mm') : '—'} />
                  <PanelRow label="Last Activity" value={stats.lastSeen ? format(new Date(stats.lastSeen), 'dd MMM yyyy HH:mm') : '—'} />
                </div>
              </Panel>
            </div>

            {/* Intelligence panel */}
            <div className="space-y-4">
              <Panel title="Classification">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Analytical Classification</p>
                    <ClassificationBadge classification={classification} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Investigation Priority</p>
                    <RiskBadge level={riskLevel} />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    Classifications are produced by the deterministic investigation engine and represent investigative findings, not legal conclusions.
                  </div>
                </div>
              </Panel>

              {vaspAttribution ? (
                <Panel title="VASP Attribution">
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">Possible VASP</p>
                      <span className="text-xs font-semibold text-[var(--accent-purple)]">{vaspAttribution.vaspName}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">Attribution Type</p>
                      <Badge variant="purple">{vaspAttribution.attributionType || 'INDIRECT'}</Badge>
                    </div>
                    {vaspAttribution.confidence && (
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-1">Confidence</p>
                        <ConfidenceBadge level={vaspAttribution.confidence} />
                      </div>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                      VASP attribution is an analytical finding. "Possible VASP" does not constitute confirmed identification.
                    </p>
                  </div>
                </Panel>
              ) : (
                <Panel title="VASP Attribution">
                  <div className="py-3 text-center text-xs text-[var(--text-muted)]">
                    <Shield size={16} className="mx-auto mb-2 opacity-40" />
                    No VASP attribution data available. Run a full investigation to analyze behavioral patterns.
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <Panel title={`Transactions ${allTransactions.length ? `(${allTransactions.length})` : ''}`} noPad
            actions={
              <div className="flex items-center gap-2">
                {txsLoading && <Spinner size={12} />}
                <Button size="xs" variant="secondary" loading={collectLoading} onClick={fetchBlockchainData}>
                  {collectData ? 'Refresh' : 'Collect from Blockchain'}
                </Button>
              </div>
            }
          >
            {allTransactions.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No transactions loaded"
                description="Click 'Collect from Blockchain' to retrieve TRC-20 USDT transfers via TronGrid. Data source and retrieval time are always recorded."
                action={
                  <Button size="sm" loading={collectLoading} onClick={fetchBlockchainData}>
                    Collect from Blockchain
                  </Button>
                }
              />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {['Tx Hash', 'From', 'To', 'Amount', 'Token', 'Date', 'Source'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.map((tx, i) => (
                    <tr key={tx.transactionHash || tx._id || i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--accent-blue)]">
                        {tx.transactionHash ? `${tx.transactionHash.substring(0, 10)}…` : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-secondary)]">
                        {tx.from ? `${tx.from.substring(0, 8)}…` : '—'}
                        {tx.from === address && <Badge variant="red" size="xs" className="ml-1">OUT</Badge>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-secondary)]">
                        {tx.to ? `${tx.to.substring(0, 8)}…` : '—'}
                        {tx.to === address && <Badge variant="blue" size="xs" className="ml-1">IN</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">
                        {tx.amount ? Number(tx.amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">{tx.token || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] whitespace-nowrap">
                        {tx.timestamp ? format(new Date(tx.timestamp), 'dd MMM HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {(tx.isDemo || tx.dataSource === 'DEMO') ? (
                          <DemoBanner />
                        ) : tx.provenance?.sourceStatus === 'LIVE' ? (
                          <span className="text-[10px] text-[var(--accent-green)] font-semibold">LIVE</span>
                        ) : (
                          <Badge variant="default" size="xs">{tx.dataSource || '—'}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {activeTab === 'connections' && (
          <Panel title="Connected Wallets">
            <div className="py-6 text-center text-xs text-[var(--text-muted)]">
              <Network size={20} className="mx-auto mb-2 opacity-40" />
              Run a full investigation on the associated case to build the transaction graph and reveal wallet connections.
              {wallet?.case && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ChevronRight}
                    onClick={() => navigate(`/cases/${typeof wallet.case === 'object' ? wallet.case._id : wallet.case}`)}
                  >
                    Open Investigation Case
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
