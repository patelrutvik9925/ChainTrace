/**
 * TransactionsPage — Stage 5: TRON/TRC-20 Transaction Explorer
 *
 * Lists normalized blockchain transactions with:
 * - Full data provenance (provider, retrieval time, source status)
 * - Live vs. Demo data clearly distinguished
 * - Per-transaction detail panel
 * - Filters: address, chain, token, page
 *
 * ⚠ Wallet addresses do not identify real-world persons.
 *   All data is labelled with its source. DEMO data is never
 *   presented as live blockchain activity.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Activity, Copy, CheckCheck, ChevronRight, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Info, AlertTriangle, Shield,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, Spinner, EmptyState } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { Badge, DemoBanner } from '../components/ui/Badge.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Data Source Badge ─────────────────────────────────────────────────────────
function DataSourceBadge({ source, isLive }) {
  if (isLive || source === 'TRONGRID_LIVE') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#3fb95020] text-[var(--accent-green)] border border-[#3fb95040] uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
        LIVE
      </span>
    );
  }
  if (source === 'DEMO' || source === 'DEMO_FALLBACK' || source === 'TRONGRID_DEMO_FALLBACK') {
    return <DemoBanner />;
  }
  return <Badge variant="default">{source || 'UNKNOWN'}</Badge>;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <button onClick={copy} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors ml-1">
      {copied ? <CheckCheck size={10} className="text-[var(--accent-green)]" /> : <Copy size={10} />}
    </button>
  );
}

// ── Direction indicator ───────────────────────────────────────────────────────
function DirectionBadge({ from, to, address }) {
  if (!address) return null;
  if (from === address) return (
    <span className="flex items-center gap-1 text-[10px] text-[var(--accent-red)]">
      <ArrowUpRight size={10} /> OUT
    </span>
  );
  if (to === address) return (
    <span className="flex items-center gap-1 text-[10px] text-[var(--accent-green)]">
      <ArrowDownLeft size={10} /> IN
    </span>
  );
  return null;
}

// ── Transaction detail panel ──────────────────────────────────────────────────
function TransactionDetailPanel({ tx, onClose }) {
  if (!tx) return null;
  return (
    <div className="panel border-l-2 border-[var(--accent-blue)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Transaction Detail</h3>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-base leading-none">×</button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        {/* Provenance notice */}
        <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <Shield size={11} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-[var(--text-primary)] mb-0.5">Data Provenance</div>
            <div className="text-[var(--text-muted)]">
              Source: <span className="text-[var(--text-primary)]">{tx.provenance?.provider || tx.dataSource || '—'}</span>
              {' · '}Retrieved: <span className="text-[var(--text-primary)]">{tx.provenance?.retrievedAt ? format(new Date(tx.provenance.retrievedAt), 'dd MMM yyyy HH:mm') : '—'}</span>
            </div>
            <div className="text-[var(--text-muted)] mt-0.5">
              Status: <DataSourceBadge source={tx.provenance?.sourceStatus || tx.dataSource} isLive={tx.provenance?.sourceStatus === 'LIVE'} />
            </div>
          </div>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          <Row label="Tx Hash">
            <span className="font-mono text-[10px] break-all text-[var(--accent-blue)]">
              {tx.transactionHash || '—'}
              {tx.transactionHash && <CopyBtn text={tx.transactionHash} />}
            </span>
          </Row>
          <Row label="Chain"><Badge variant="default">{tx.chain || '—'}</Badge></Row>
          <Row label="Token"><Badge variant="blue">{tx.token || '—'}</Badge></Row>
          <Row label="Amount">
            <span className="text-[var(--text-primary)] font-semibold">
              {tx.amount ? `${Number(tx.amount).toLocaleString()} ${tx.token || ''}` : '—'}
            </span>
          </Row>
          <Row label="From">
            <span className="font-mono text-[10px] break-all text-[var(--text-secondary)]">
              {tx.from || '—'}{tx.from && <CopyBtn text={tx.from} />}
            </span>
          </Row>
          <Row label="To">
            <span className="font-mono text-[10px] break-all text-[var(--text-secondary)]">
              {tx.to || '—'}{tx.to && <CopyBtn text={tx.to} />}
            </span>
          </Row>
          <Row label="Block" value={tx.blockNumber ? `#${tx.blockNumber.toLocaleString()}` : '—'} />
          <Row label="Status">
            <Badge variant={tx.transactionStatus === 'SUCCESS' ? 'green' : tx.transactionStatus === 'FAILED' ? 'red' : 'default'}>
              {tx.transactionStatus || '—'}
            </Badge>
          </Row>
          <Row label="Timestamp" value={tx.timestamp ? format(new Date(tx.timestamp), 'dd MMM yyyy HH:mm:ss') : '—'} />
          {tx.contractAddress && (
            <Row label="Contract">
              <span className="font-mono text-[10px] break-all text-[var(--text-muted)]">
                {tx.contractAddress}<CopyBtn text={tx.contractAddress} />
              </span>
            </Row>
          )}
          {tx.amountRaw && (
            <Row label="Raw Amount" value={`${tx.amountRaw} (smallest unit)`} />
          )}
        </div>

        {tx.provenance?.referenceUrl && (
          <a
            href={tx.provenance.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[var(--accent-blue)] hover:underline"
          >
            <ChevronRight size={11} /> View on TronScan
          </a>
        )}

        {(tx.dataSource === 'DEMO' || tx.isDemo) && (
          <div className="flex items-start gap-2 p-2.5 rounded bg-[#d2992215] border border-[#d2992240] text-[11px] text-[var(--accent-orange)]">
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
            This is DEMO data. It is not a real blockchain transaction and must not be presented as one.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, children }) {
  return (
    <div className="flex items-start justify-between py-2 gap-4">
      <span className="text-[var(--text-muted)] shrink-0 w-28">{label}</span>
      <span className="text-[var(--text-primary)] text-right">{children || value || '—'}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialAddress = searchParams.get('address') || '';
  const initialCaseId  = searchParams.get('caseId') || '';

  const [address, setAddress] = useState(initialAddress);
  const [caseId, setCaseId]   = useState(initialCaseId);
  const [chain, setChain]     = useState('TRON');
  const [token, setToken]     = useState('USDT');

  const [txs, setTxs]         = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo]   = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [selected, setSelected] = useState(null);

  // Collection state
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState(null);

  const limit = 50;

  const load = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ chain, token, page: pg, limit });
      if (address) params.set('address', address);
      if (caseId)  params.set('caseId', caseId);
      const res = await api.get(`/transactions?${params}`);
      const d = res.data.data;
      setTxs(d.transactions || []);
      setTotal(d.total || 0);
      setIsDemo(d.isDemo);
      setDataSource(d.dataSource || '');
      setPage(pg);
    } catch {
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [address, caseId, chain, token]);

  const handleCollect = async () => {
    if (!address.trim()) { toast.error('Enter a wallet address to collect data.'); return; }
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await api.post('/transactions/collect', {
        address: address.trim(), chain, token,
        caseId: caseId || undefined,
      });
      const d = res.data.data;
      setCollectResult(d);
      toast.success(`Collected ${d.summary?.total ?? 0} ${token} transfers — source: ${d.dataSource}`);
      await load(1);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Collection failed.';
      toast.error(msg);
      setCollectResult({ error: msg });
    } finally {
      setCollecting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Transaction Explorer"
        subtitle="TRON / TRC-20 USDT — Normalized Blockchain Data"
        showDemoMode={isDemo}
      />

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Filter bar */}
          <Panel>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Wallet Address"
                placeholder="Filter by address…"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="min-w-[260px]"
                containerClass="flex-1"
              />
              <Select label="Chain" value={chain} onChange={e => setChain(e.target.value)} containerClass="w-32">
                <option value="TRON">TRON</option>
                <option value="ETHEREUM" disabled>Ethereum</option>
                <option value="BITCOIN" disabled>Bitcoin</option>
              </Select>
              <Select label="Token" value={token} onChange={e => setToken(e.target.value)} containerClass="w-32">
                <option value="USDT">USDT</option>
                <option value="TRX">TRX</option>
              </Select>
              <div className="flex gap-2 items-end">
                <Button variant="secondary" icon={RefreshCw} onClick={() => load(1)} loading={loading}>
                  Refresh
                </Button>
                <Button icon={Activity} onClick={handleCollect} loading={collecting}>
                  Collect from Blockchain
                </Button>
              </div>
            </div>
          </Panel>

          {/* Collect result summary */}
          {collectResult && !collectResult.error && (
            <div className="flex items-start gap-3 p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--text-primary)]">Collection Result</span>
                  <DataSourceBadge source={collectResult.dataSource} isLive={collectResult.isLive} />
                </div>
                <div className="text-[var(--text-muted)] space-x-3">
                  <span>Total: <span className="text-[var(--text-primary)] font-medium">{collectResult.summary?.total}</span></span>
                  <span>In: <span className="text-[var(--accent-green)]">{collectResult.summary?.incoming}</span></span>
                  <span>Out: <span className="text-[var(--accent-red)]">{collectResult.summary?.outgoing}</span></span>
                  {collectResult.stored > 0 && <span>Stored: <span className="text-[var(--accent-blue)]">{collectResult.stored}</span></span>}
                  <span>Provider: <span className="text-[var(--text-primary)]">{collectResult.provenance?.provider}</span></span>
                  <span>Retrieved: <span className="text-[var(--text-primary)]">{collectResult.collectedAt ? format(new Date(collectResult.collectedAt), 'HH:mm:ss') : '—'}</span></span>
                </div>
              </div>
              <button onClick={() => setCollectResult(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
            </div>
          )}

          {/* Analytical notice */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] px-1">
            <Info size={11} className="text-[var(--accent-blue)] shrink-0" />
            Wallet addresses are investigation identifiers — they do not reveal real-world identities. All data sources are recorded in the provenance field.
          </div>

          {/* Transaction table */}
          <Panel
            title={`Transactions ${total ? `(${total.toLocaleString()})` : ''}`}
            noPad
            actions={
              <div className="flex items-center gap-2">
                {isDemo && <DemoBanner />}
                {!isDemo && dataSource && <Badge variant="green" size="xs">{dataSource}</Badge>}
              </div>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-16"><Spinner size={20} /></div>
            ) : txs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No transactions found"
                description="Enter a wallet address and click 'Collect from Blockchain' to retrieve TRC-20 USDT transfers."
              />
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      {['Tx Hash', 'From', 'To', 'Amount', 'Token', 'Block', 'Status', 'Date', 'Source'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx, i) => (
                      <tr
                        key={tx.transactionHash || tx._id || i}
                        onClick={() => setSelected(selected?.transactionHash === tx.transactionHash ? null : tx)}
                        className={`border-b border-[var(--border-subtle)] last:border-0 cursor-pointer transition-colors ${
                          selected?.transactionHash === tx.transactionHash
                            ? 'bg-[var(--accent-blue-subtle)]'
                            : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/transactions/${tx.transactionHash}`); }}
                              className="font-mono text-[var(--accent-blue)] hover:underline text-[10px]"
                            >
                              {tx.transactionHash ? `${tx.transactionHash.substring(0, 10)}…` : '—'}
                            </button>
                            {tx.transactionHash && <CopyBtn text={tx.transactionHash} />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/wallets/${encodeURIComponent(tx.from)}?chain=${tx.chain}`); }}
                              className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:underline"
                            >
                              {tx.from ? `${tx.from.substring(0, 8)}…` : '—'}
                            </button>
                            <DirectionBadge from={tx.from} to={tx.to} address={address} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/wallets/${encodeURIComponent(tx.to)}?chain=${tx.chain}`); }}
                            className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:underline"
                          >
                            {tx.to ? `${tx.to.substring(0, 8)}…` : '—'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                          {tx.amount ? Number(tx.amount).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">{tx.token || '—'}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono text-[10px]">
                          {tx.blockNumber ? `#${tx.blockNumber.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={tx.transactionStatus === 'SUCCESS' ? 'green' : 'default'} size="xs">
                            {tx.transactionStatus || '—'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)] whitespace-nowrap">
                          {tx.timestamp ? format(new Date(tx.timestamp), 'dd MMM HH:mm') : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <DataSourceBadge source={tx.dataSource} isLive={tx.provenance?.sourceStatus === 'LIVE'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--text-muted)]">
                      Page {page} of {totalPages} · {total.toLocaleString()} total
                    </span>
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
                      <Button size="xs" variant="secondary" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>

        {/* ── Detail panel ──────────────────────────────────────────────────── */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-[var(--border-subtle)] overflow-y-auto bg-[var(--bg-secondary)]">
            <TransactionDetailPanel tx={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
