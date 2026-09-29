/**
 * WalletIntakePage — Stage 4: Wallet Intake + Validation
 *
 * Allows an investigator to submit a victim-reported wallet address,
 * validate it (format + chain), associate it with a case, and collect
 * a basic blockchain profile.
 *
 * IMPORTANT: A wallet address does NOT reveal a person's real-world identity.
 * All classifications are analytical findings, not absolute facts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, CheckCircle, AlertTriangle, Copy, CheckCheck,
  ChevronRight, Search, Info, Network, ArrowRight, XCircle,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { Badge, RiskBadge, DemoBanner } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Panel.jsx';
import { Tooltip } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

// ── Supported chains / assets ──────────────────────────────────────────────────
const CHAINS = [
  { value: 'TRON',     label: 'TRON',     note: 'Primary (TRC-20 USDT)',  supported: true },
  { value: 'ETHEREUM', label: 'Ethereum', note: 'ERC-20 (architecture)',   supported: true },
  { value: 'BITCOIN',  label: 'Bitcoin',  note: 'BTC (architecture)',      supported: true },
];

const CHAIN_ASSETS = {
  TRON:     ['USDT (TRC-20)', 'TRX'],
  ETHEREUM: ['USDT (ERC-20)', 'ETH', 'USDC'],
  BITCOIN:  ['BTC'],
};

// ── Validation state machine ───────────────────────────────────────────────────
// idle → validating → valid | invalid
// valid → submitting → success | error

function ValidationIndicator({ state, message }) {
  if (state === 'idle')       return null;
  if (state === 'validating') return <span className="flex items-center gap-1.5 text-[var(--text-muted)]"><Spinner size={12} /> Validating…</span>;
  if (state === 'valid')      return <span className="flex items-center gap-1.5 text-[var(--accent-green)]"><CheckCircle size={12} /> {message || 'Valid address'}</span>;
  if (state === 'duplicate')  return <span className="flex items-center gap-1.5 text-[var(--accent-orange)]"><AlertTriangle size={12} /> {message || 'Already in case'}</span>;
  if (state === 'invalid')    return <span className="flex items-center gap-1.5 text-[var(--accent-red)]"><XCircle size={12} /> {message || 'Invalid address'}</span>;
  return null;
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

export default function WalletIntakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCaseId = searchParams.get('caseId') || '';

  // ── form fields ─────────────────────────────────────────────────────────────
  const [address, setAddress]     = useState('');
  const [chain, setChain]         = useState('TRON');
  const [asset, setAsset]         = useState('USDT (TRC-20)');
  const [caseId, setCaseId]       = useState(prefillCaseId);
  const [isReported, setIsReported] = useState(true);
  const [notes, setNotes]         = useState('');

  // ── ui state ────────────────────────────────────────────────────────────────
  const [cases, setCases]         = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [valState, setValState]   = useState('idle'); // idle|validating|valid|duplicate|invalid
  const [valMessage, setValMessage] = useState('');
  const [valResult, setValResult] = useState(null);
  const [collectData, setCollectData] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]  = useState(null); // wallet result after POST

  // ── load case list for selector ─────────────────────────────────────────────
  useEffect(() => {
    api.get('/cases?limit=50')
      .then(r => setCases(r.data.data?.cases || []))
      .catch(() => setCases([]))
      .finally(() => setCasesLoading(false));
  }, []);

  // sync asset when chain changes
  useEffect(() => {
    setAsset(CHAIN_ASSETS[chain]?.[0] || '');
    setValState('idle');
    setValResult(null);
    setCollectData(null);
  }, [chain]);

  // ── debounced address validation ─────────────────────────────────────────────
  useEffect(() => {
    if (!address.trim()) { setValState('idle'); setValResult(null); setCollectData(null); return; }

    const timer = setTimeout(async () => {
      setValState('validating');
      setValResult(null);
      setCollectData(null);
      try {
        const res = await api.post('/wallets/validate', {
          address: address.trim(),
          chain,
          caseId: caseId || undefined,
        });
        const d = res.data.data;
        setValResult(d);
        if (!d.valid) {
          setValState('invalid');
          setValMessage(d.reason || 'Address format is invalid for the selected chain.');
        } else if (d.isDuplicate) {
          setValState('duplicate');
          setValMessage('This address is already tracked in this case.');
        } else {
          setValState('valid');
          setValMessage(`Valid ${chain} address`);
        }
      } catch (err) {
        setValState('invalid');
        setValMessage(err.response?.data?.error?.message || 'Validation failed.');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [address, chain, caseId]);

  // ── collect blockchain preview ───────────────────────────────────────────────
  const handleCollect = async () => {
    if (valState !== 'valid' && valState !== 'duplicate') return;
    setCollecting(true);
    setCollectData(null);
    try {
      const res = await api.post('/wallets/collect', { address: address.trim(), chain, token: asset.includes('USDT') ? 'USDT' : asset });
      setCollectData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not fetch blockchain data.');
    } finally {
      setCollecting(false);
    }
  };

  // ── final submit — add wallet to case ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!address.trim()) { toast.error('Enter a wallet address.'); return; }
    if (!caseId)         { toast.error('Select a case to associate this wallet.'); return; }
    if (valState === 'invalid') { toast.error('Fix the address validation errors first.'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/wallets', {
        address: address.trim(),
        blockchain: chain,
        token: asset.includes('USDT') ? 'USDT' : asset.split(' ')[0],
        caseId,
        isOriginalReported: isReported,
        notes,
      });
      const wallet = res.data.data.wallet;
      const existed = res.data.data.alreadyExisted;
      setSubmitted(wallet);
      toast.success(existed ? 'Wallet already tracked — loaded existing profile.' : 'Wallet added to investigation.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to add wallet.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── success state — show result and navigation options ────────────────────────
  if (submitted) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Wallet Intake" subtitle="Address submitted" />
        <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
          <div className="w-full max-w-xl space-y-4">
            <Panel>
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#3fb95015] flex items-center justify-center mb-4 border border-[#3fb95040]">
                  <CheckCircle size={24} className="text-[var(--accent-green)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Wallet Recorded</h2>
                <p className="text-xs text-[var(--text-muted)] mb-4 max-w-xs">
                  The wallet has been associated with the investigation case. Classification is analytical only — the address does not identify a real-world person.
                </p>
                {submitted.isDemo && <DemoBanner className="mb-4" />}
                <div className="bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)] px-4 py-3 w-full text-left mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Wallet Address</span>
                    <CopyBtn text={submitted.address} />
                  </div>
                  <span className="font-mono text-xs text-[var(--accent-blue)] break-all">{submitted.address}</span>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="default">{submitted.blockchain}</Badge>
                    {submitted.isOriginalReported && <Badge variant="red">Reported Suspect</Badge>}
                    {submitted.classification && <Badge variant="orange">{submitted.classification.replace(/_/g, ' ')}</Badge>}
                    {submitted.isDemo && <Badge variant="demo">DEMO</Badge>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => { setSubmitted(null); setAddress(''); setValState('idle'); setCollectData(null); }}>
                    Add Another Wallet
                  </Button>
                  <Button icon={ChevronRight} iconRight={ArrowRight} onClick={() => navigate(`/cases/${caseId}`)}>
                    Open Case
                  </Button>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  const canCollect = (valState === 'valid' || valState === 'duplicate') && !collecting;
  const canSubmit  = address.trim() && caseId && valState !== 'invalid' && valState !== 'idle';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Wallet Intake"
        subtitle="Add victim-reported or suspect wallet to investigation"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Analytical notice banner */}
          <div className="flex items-start gap-3 p-3 rounded border border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/5 text-xs text-[var(--text-secondary)]">
            <Info size={14} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
            <span>
              <strong className="text-[var(--text-primary)]">Analytical intelligence only.</strong>{' '}
              A wallet address does not automatically reveal a person's real-world identity. All classifications are investigative findings with confidence levels, not confirmed facts.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── Left: Input form ─────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              <Panel title="Wallet Address">
                <div className="space-y-4">
                  {/* Address input */}
                  <div>
                    <Input
                      label="Suspect / Reported Wallet Address"
                      placeholder="Enter full wallet address…"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      icon={Search}
                      hint="Paste the complete address as reported by the victim."
                      error={valState === 'invalid' ? valMessage : undefined}
                    />
                    <div className="mt-1.5 text-[11px] flex items-center gap-1.5 h-4">
                      <ValidationIndicator state={valState} message={valMessage} />
                    </div>
                  </div>

                  {/* Chain + Asset row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Blockchain"
                      value={chain}
                      onChange={e => setChain(e.target.value)}
                    >
                      {CHAINS.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label} {!c.supported ? '(unsupported)' : ''}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Asset / Token"
                      value={asset}
                      onChange={e => setAsset(e.target.value)}
                    >
                      {(CHAIN_ASSETS[chain] || []).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Chain info pill */}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <Network size={11} />
                    {chain === 'TRON' && <span>Primary investigation chain — TRC-20 USDT tracing supported.</span>}
                    {chain === 'ETHEREUM' && <span>Architecture ready — Ethereum adapter available (limited live data).</span>}
                    {chain === 'BITCOIN' && <span>Architecture ready — Bitcoin adapter available (limited live data).</span>}
                  </div>
                </div>
              </Panel>

              {/* Case association */}
              <Panel title="Case Association">
                <div className="space-y-3">
                  <Select
                    label="Associate with Case"
                    value={caseId}
                    onChange={e => setCaseId(e.target.value)}
                    error={!caseId && submitting ? 'Select a case' : undefined}
                  >
                    <option value="">— Select investigation case —</option>
                    {casesLoading ? (
                      <option disabled>Loading cases…</option>
                    ) : cases.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.caseId} — {c.caseName}
                      </option>
                    ))}
                  </Select>

                  {/* Reported suspect toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => setIsReported(v => !v)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer
                        ${isReported ? 'bg-[var(--accent-red)] border-[var(--accent-red)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)]'}`}
                    >
                      {isReported && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[var(--text-primary)]">Victim-reported suspect address</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Mark as the original wallet address reported by the victim. This preserves evidence provenance.</div>
                    </div>
                  </label>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide block mb-1">
                      Investigator Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Source of this address, victim report reference, NCRP complaint number…"
                      rows={3}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-colors"
                    />
                  </div>
                </div>
              </Panel>

              {/* Submit row */}
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleCollect}
                    disabled={!canCollect}
                    loading={collecting}
                    icon={Network}
                  >
                    Preview Blockchain Data
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    loading={submitting}
                    icon={Shield}
                  >
                    Add to Investigation
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Right: Validation + preview panel ────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Validation Status">
                <ValidationStatusCard state={valState} result={valResult} address={address} chain={chain} />
              </Panel>

              {collectData && (
                <Panel title="Blockchain Data Preview" actions={<DemoBanner />}>
                  <BlockchainPreview data={collectData} />
                </Panel>
              )}

              {!collectData && valState === 'valid' && (
                <Panel>
                  <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                    <Network size={20} className="mx-auto mb-2 opacity-40" />
                    Click <strong>Preview Blockchain Data</strong> to fetch available on-chain activity for this address before adding it to the investigation.
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validation status card ────────────────────────────────────────────────────
function ValidationStatusCard({ state, result, address, chain }) {
  if (state === 'idle' || !address) {
    return (
      <div className="py-6 text-center text-xs text-[var(--text-muted)]">
        <Shield size={20} className="mx-auto mb-2 opacity-30" />
        Enter a wallet address to begin validation.
      </div>
    );
  }
  if (state === 'validating') {
    return <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]"><Spinner size={14} /> Checking address format…</div>;
  }

  const statusMap = {
    valid:     { icon: CheckCircle, color: 'var(--accent-green)', label: 'Address Valid', bg: '#3fb95010', border: '#3fb95030' },
    duplicate: { icon: AlertTriangle, color: 'var(--accent-orange)', label: 'Already Tracked', bg: '#d2992215', border: '#d2992240' },
    invalid:   { icon: XCircle, color: 'var(--accent-red)', label: 'Invalid Address', bg: '#f8514910', border: '#f8514930' },
  };
  const s = statusMap[state] || statusMap.invalid;
  const Icon = s.icon;

  return (
    <div>
      <div
        className="rounded p-3 mb-3 flex items-center gap-3"
        style={{ background: s.bg, borderColor: s.border, border: `1px solid ${s.border}` }}
      >
        <Icon size={16} style={{ color: s.color }} className="shrink-0" />
        <div>
          <div className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {state === 'valid' && `Format matches ${chain} address specification.`}
            {state === 'duplicate' && 'This address is already being tracked in the selected case.'}
            {state === 'invalid' && (result?.reason || 'The address does not match the expected format for this chain.')}
          </div>
        </div>
      </div>

      {state !== 'invalid' && (
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Chain</span>
            <span className="text-[var(--text-primary)] font-medium">{chain}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Format check</span>
            <span className="text-[var(--accent-green)]">Passed</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Duplicate check</span>
            <span className={state === 'duplicate' ? 'text-[var(--accent-orange)]' : 'text-[var(--accent-green)]'}>
              {state === 'duplicate' ? 'Duplicate' : 'Clear'}
            </span>
          </div>
          {result?.demoMode && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Data mode</span>
              <Badge variant="demo" size="xs">DEMO</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Blockchain preview card ───────────────────────────────────────────────────
function BlockchainPreview({ data }) {
  if (!data) return null;
  const p = data.profile || {};
  const txCount = data.transfers?.length ?? 0;

  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
        <span className="text-[var(--text-muted)]">Data Source</span>
        <span className={`font-medium ${data.isLive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-orange)]'}`}>
          {data.dataSource || (data.isLive ? 'LIVE' : 'DEMO')}
        </span>
      </div>
      <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
        <span className="text-[var(--text-muted)]">Transactions</span>
        <span className="text-[var(--text-primary)] font-medium">{p.txCount ?? txCount}</span>
      </div>
      <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
        <span className="text-[var(--text-muted)]">Total Received</span>
        <span className="text-[var(--text-primary)]">{p.totalReceived ? `${parseFloat(p.totalReceived).toLocaleString()} ${data.token}` : '—'}</span>
      </div>
      <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
        <span className="text-[var(--text-muted)]">Total Sent</span>
        <span className="text-[var(--text-primary)]">{p.totalSent ? `${parseFloat(p.totalSent).toLocaleString()} ${data.token}` : '—'}</span>
      </div>
      {p.firstSeen && (
        <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
          <span className="text-[var(--text-muted)]">First Seen</span>
          <span className="text-[var(--text-primary)]">{new Date(p.firstSeen).toLocaleDateString()}</span>
        </div>
      )}
      {p.lastSeen && (
        <div className="flex justify-between py-1">
          <span className="text-[var(--text-muted)]">Last Activity</span>
          <span className="text-[var(--text-primary)]">{new Date(p.lastSeen).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
