import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import {
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Play,
  Info, X, Network, AlertTriangle, Shield, Copy, CheckCheck,
  Eye, EyeOff, ChevronRight, Activity,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, PanelRow, Spinner, EmptyState } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, StatusBadge, DemoBanner, ConfidenceBadge, SeverityBadge } from '../components/ui/Badge.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

// ── Cytoscape styles ──────────────────────────────────────────────────────────
const CY_STYLE = [
  { selector: 'node', style: {
    'background-color': '#21262d', 'border-color': '#3d444d', 'border-width': 1.5,
    'width': 36, 'height': 36, 'label': 'data(label)',
    'font-size': 9, 'color': '#8b949e',
    'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 4,
    'text-max-width': 80, 'text-wrap': 'ellipsis',
  }},
  { selector: 'node[type="REPORTED_SUSPECT"]', style: {
    'background-color': '#2d1b1b', 'border-color': '#f85149', 'border-width': 2.5,
    'width': 46, 'height': 46, 'color': '#f85149',
  }},
  { selector: 'node[type="VASP_DEPOSIT"], node[type="VASP_OMNIBUS"]', style: {
    'background-color': '#1e1b2e', 'border-color': '#bc8cff', 'border-width': 2.5,
    'width': 46, 'height': 46, 'color': '#bc8cff', 'shape': 'diamond',
  }},
  { selector: 'node[type="INTERMEDIARY"]', style: {
    'background-color': '#1c2010', 'border-color': '#d29922', 'border-width': 1.5,
    'color': '#d29922',
  }},
  { selector: 'node[type="MULE"]', style: {
    'background-color': '#2a1a10', 'border-color': '#d29922', 'border-width': 1.5,
    'color': '#d29922',
  }},
  { selector: 'node[type="MIXER_PRIVACY"]', style: {
    'background-color': '#2a1020', 'border-color': '#f85149', 'border-width': 2,
    'border-style': 'dashed', 'color': '#f85149',
  }},
  { selector: 'node.highlighted', style: {
    'border-color': '#388bfd', 'border-width': 3,
    'background-color': '#0d2a4d',
  }},
  { selector: 'node.suspicious', style: {
    'border-color': '#f85149', 'border-width': 3,
    'background-color': '#2d1015',
  }},
  { selector: 'node:selected', style: {
    'border-color': '#388bfd', 'border-width': 3,
  }},
  { selector: 'edge', style: {
    'width': 1.5, 'line-color': '#30363d',
    'target-arrow-color': '#30363d', 'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    'label': 'data(amountLabel)', 'font-size': 8,
    'color': '#6e7681', 'text-rotation': 'autorotate',
    'text-background-color': '#0d1117', 'text-background-opacity': 0.7,
    'text-background-padding': '2px',
  }},
  { selector: 'edge:selected', style: {
    'line-color': '#388bfd', 'target-arrow-color': '#388bfd', 'width': 2.5,
  }},
  { selector: 'edge.path-edge', style: {
    'line-color': '#d29922', 'target-arrow-color': '#d29922', 'width': 2.5,
  }},
];

const NODE_TYPE_LABELS = {
  REPORTED_SUSPECT: 'Reported Suspect',
  INTERMEDIARY: 'Possible Intermediary',
  MULE: 'Possible Mule',
  VASP_DEPOSIT: 'Possible VASP Deposit',
  VASP_OMNIBUS: 'VASP Omnibus',
  MIXER_PRIVACY: 'Mixer / Privacy Service',
  FRAUD_SOURCE: 'Possible Fraud Source',
  UNKNOWN: 'Unknown',
};

// ── Node Inspector ────────────────────────────────────────────────────────────
function NodeInspector({ node, onClose, onTrace, navigate }) {
  const [copied, setCopied] = useState(false);
  if (!node) return null;
  const d = node.data();
  const copyAddr = () => {
    navigator.clipboard.writeText(d.fullAddress || d.id).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="w-72 shrink-0 flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Wallet Inspector</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Wallet Address</p>
          <div className="flex items-start gap-2">
            <span className="font-mono text-[11px] text-[var(--accent-blue)] break-all flex-1">{d.fullAddress || d.id}</span>
            <button onClick={copyAddr} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent-blue)] mt-0.5">
              {copied ? <CheckCheck size={12} className="text-[var(--accent-green)]" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div className="space-y-2.5 text-xs">
          {d.type && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Classification</span><span className="text-[var(--text-primary)] font-medium">{NODE_TYPE_LABELS[d.type] || d.type}</span></div>}
          {d.riskLevel && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Risk</span><RiskBadge level={d.riskLevel} /></div>}
          {d.chain && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Chain</span><Badge variant="blue">{d.chain}</Badge></div>}
          {d.hopDepth !== undefined && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Hop Depth</span><span>{d.hopDepth}</span></div>}
          {d.txCount !== undefined && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Transactions</span><span>{d.txCount}</span></div>}
          {d.totalReceived && parseFloat(d.totalReceived) > 0 && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Total Received</span><span className="text-[var(--accent-green)]">{parseFloat(d.totalReceived).toLocaleString()} USDT</span></div>}
        </div>

        {d.vaspName && (
          <div className="bg-[#bc8cff10] border border-[#bc8cff30] rounded p-3">
            <p className="text-[10px] text-[var(--accent-purple)] uppercase tracking-wide mb-2 font-semibold">⚑ Possible VASP Attribution</p>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{d.vaspName}</p>
            <ConfidenceBadge level={d.vaspConfidence} />
            <p className="text-[10px] text-[var(--text-muted)] mt-2">Analytical attribution — not confirmed identification. Verify through LEA coordination.</p>
          </div>
        )}

        {d.isDemo && (
          <div className="bg-[#d2992210] border border-[#d2992230] rounded px-2 py-1.5">
            <p className="text-[10px] text-[var(--accent-orange)]">⚠ DEMO DATA — Not live blockchain data</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button size="xs" variant="secondary" icon={Eye} onClick={() => navigate(`/wallets/${encodeURIComponent(d.fullAddress || d.id)}?chain=${d.chain || 'TRON'}`)}>
            View Wallet Profile
          </Button>
          <Button size="xs" variant="secondary" icon={Activity} onClick={() => navigate(`/transactions?address=${encodeURIComponent(d.fullAddress || d.id)}&chain=${d.chain || 'TRON'}`)}>
            View Transactions
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Edge Inspector ─────────────────────────────────────────────────────────────
function EdgeInspector({ edge, onClose }) {
  if (!edge) return null;
  const d = edge.data();
  return (
    <div className="w-72 shrink-0 flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Transaction</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] mb-1">Transaction Hash</p>
          <p className="font-mono text-[10px] text-[var(--accent-blue)] break-all">{d.transactionHash || '—'}</p>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] text-xs">
          <div className="py-2 flex justify-between"><span className="text-[var(--text-muted)]">Amount</span><span className="text-[var(--text-primary)] font-semibold">{d.amount ? `${parseFloat(d.amount).toLocaleString()} ${d.token || 'USDT'}` : '—'}</span></div>
          <div className="py-2 flex justify-between"><span className="text-[var(--text-muted)]">Status</span><StatusBadge status={d.status} /></div>
          <div className="py-2 flex justify-between"><span className="text-[var(--text-muted)]">Timestamp</span><span className="text-[var(--text-muted)]">{d.timestamp ? new Date(d.timestamp).toLocaleString() : '—'}</span></div>
          {d.isDemo && <div className="py-2"><span className="text-[10px] text-[var(--accent-orange)]">⚠ DEMO DATA</span></div>}
        </div>
      </div>
    </div>
  );
}

// ── Findings sidebar ──────────────────────────────────────────────────────────
const FINDING_TYPE_LABELS = {
  RAPID_MOVEMENT:     'Rapid Movement',
  SPLITTING:          'Fund Splitting',
  CONSOLIDATION:      'Consolidation',
  MULTI_HOP_LAYERING: 'Multi-Hop Layering',
  HIGH_VELOCITY:      'High Velocity',
  PEEL_CHAIN:         'Peel Chain',
  VASP_ATTRIBUTION:   'VASP Attribution',
  VASP_DEPOSIT:       'Possible VASP Deposit',
  MIXER_INTERACTION:  'Mixer Interaction',
};

function FindingsSidebar({ findings, risk, isDemo, onClose, onNodeSelect }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '384px', zIndex: 50 }}
      className="flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-[var(--accent-blue)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            Investigation Findings ({findings.length})
          </span>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={14} />
        </button>
      </div>

      {/* Risk summary bar */}
      {risk && (
        <div className={`px-4 py-2.5 shrink-0 border-b border-[var(--border-subtle)] flex items-center justify-between
          ${risk.level === 'HIGH' ? 'bg-[#f8514912]' : risk.level === 'MEDIUM' ? 'bg-[#d2992212]' : 'bg-[#3fb95012]'}`}
        >
          <span className="text-[11px] text-[var(--text-muted)]">Investigation Priority</span>
          <div className="flex items-center gap-2">
            <RiskBadge level={risk.level} />
            {risk.indicators?.length > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">{risk.indicators.length} indicator{risk.indicators.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* Demo notice */}
      {isDemo && (
        <div className="px-4 py-1.5 shrink-0 bg-[#d2992210] border-b border-[#d2992230]">
          <p className="text-[10px] text-[var(--accent-orange)]">⚠ DEMO DATA — findings are based on simulated investigation data, not live blockchain</p>
        </div>
      )}

      {/* Analytical disclaimer */}
      <div className="px-4 py-2 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)]">
          Findings are analytical intelligence, not legal conclusions. All classifications require verification.
        </p>
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {findings.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Activity size={20} className="text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Loading findings…</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Click Analyze to run the investigation engine</p>
          </div>
        )}
        {findings.map((f, i) => {
          const isOpen = expanded === i;
          const typeLabel = FINDING_TYPE_LABELS[f.findingType] || f.findingType?.replace(/_/g, ' ') || '—';
          return (
            <div
              key={i}
              className={`rounded border transition-colors ${
                isOpen
                  ? 'border-[var(--accent-blue)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-default)]'
              }`}
            >
              {/* Finding header — always visible, click to expand */}
              <button
                className="w-full text-left px-3 py-2.5"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight block">{f.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{typeLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SeverityBadge severity={f.severity} />
                    <ChevronRight size={11} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">{f.explanation}</p>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-3 pb-3 border-t border-[var(--border-subtle)] pt-2.5 space-y-2.5">
                  {/* Confidence */}
                  {f.confidence?.level && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Confidence</span>
                      <ConfidenceBadge level={f.confidence.level} />
                    </div>
                  )}

                  {/* Evidence observations */}
                  {f.evidence?.observations?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Supporting Evidence</p>
                      <ul className="space-y-1">
                        {f.evidence.observations.map((o, j) => (
                          <li key={j} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
                            <span className="text-[var(--accent-green)] mt-0.5 shrink-0">•</span>{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Analysis rule */}
                  {f.evidence?.analysisRule && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)]">Detection Rule</span>
                      <code className="text-[10px] text-[var(--accent-blue)] font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">
                        {f.evidence.analysisRule}
                      </code>
                    </div>
                  )}

                  {/* Related wallets — clickable to highlight in graph */}
                  {f.relatedWallets?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Related Wallets</p>
                      <div className="space-y-1">
                        {f.relatedWallets.slice(0, 3).map((addr, j) => (
                          <button
                            key={j}
                            onClick={() => onNodeSelect?.(addr)}
                            className="w-full text-left font-mono text-[10px] text-[var(--accent-blue)] hover:underline bg-[var(--bg-overlay)] px-2 py-1 rounded block truncate"
                            title={addr}
                          >
                            {addr.substring(0, 14)}…{addr.slice(-6)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related transactions */}
                  {f.relatedTransactions?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Related Transactions</p>
                      <div className="space-y-1">
                        {f.relatedTransactions.slice(0, 2).map((hash, j) => (
                          <p key={j} className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-overlay)] px-2 py-1 rounded truncate" title={hash}>
                            {hash.substring(0, 16)}…
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limitation note */}
                  {f.evidence?.limitations && (
                    <div className="flex items-start gap-1.5 p-2 rounded bg-[#d2992210] border border-[#d2992230]">
                      <AlertTriangle size={10} className="text-[var(--accent-orange)] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-[var(--accent-orange)]">{f.evidence.limitations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] shrink-0 bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Click a finding to expand · Click a wallet address to inspect in graph
        </p>
      </div>
    </div>
  );
}

// ── Demo findings — module-level constant, available synchronously on first render ──
const DEMO_FINDINGS_FALLBACK = [
  {
    _id: 'df-1', findingType: 'RAPID_MOVEMENT', severity: 'HIGH',
    title: 'Rapid Fund Movement Detected',
    explanation: 'Funds moved through 3 wallets within 14 hours of the initial transaction, indicating deliberate rapid layering.',
    evidence: {
      observations: ['Initial transaction at T+0h', 'Splitting to 2 wallets within 2 hours', 'Consolidation at possible VASP within 14 hours'],
      analysisRule: 'RAPID_MOVEMENT_DETECTOR_v1', dataSource: 'DEMO',
    },
    confidence: { level: 'HIGH', score: 82, basis: ['Time window', 'Multiple hops', 'Splitting pattern'] },
    isDemo: true,
  },
  {
    _id: 'df-2', findingType: 'SPLITTING', severity: 'HIGH',
    title: 'Fund Splitting Pattern (Structuring Indicator)',
    explanation: 'Funds from the intermediary wallet were split into roughly equal portions (~50/50) and forwarded to separate wallets.',
    evidence: {
      observations: ['Wallet hop1 received 50,000 USDT', 'Sent 24,800 USDT to hop2', 'Sent 24,950 USDT to hop3', 'Remaining ~250 USDT retained'],
      analysisRule: 'SPLITTING_DETECTOR_v1', dataSource: 'DEMO',
    },
    confidence: { level: 'HIGH', score: 88, basis: ['Near-equal split amounts', 'Sequential timing'] },
    isDemo: true,
  },
  {
    _id: 'df-3', findingType: 'VASP_DEPOSIT', severity: 'HIGH',
    title: 'Possible VASP Deposit Destination Identified',
    explanation: 'Terminal wallet exhibits behavior consistent with a VASP deposit address: multiple unrelated incoming wallets, high transaction velocity, and consolidation patterns.',
    evidence: {
      observations: ['250+ transactions associated with this address', 'Receives from multiple unrelated counterparties', 'Consistent consolidation/sweep behavior', 'Transaction amounts match exchange deposit patterns'],
      analysisRule: 'VASP_ATTRIBUTION_v1', dataSource: 'DEMO',
      limitations: 'Attribution is analytical, not confirmed. Direct VASP confirmation requires LEA coordination.',
    },
    confidence: { level: 'MEDIUM', score: 67, basis: ['Transaction velocity', 'Multiple counterparties', 'Consolidation pattern'] },
    isDemo: true,
  },
  {
    _id: 'df-4', findingType: 'MULTI_HOP_LAYERING', severity: 'HIGH',
    title: 'Multi-Hop Layering Pattern',
    explanation: 'Funds passed through 4 sequential wallet hops before reaching a possible VASP, consistent with layering to obscure the origin.',
    evidence: {
      observations: ['4 distinct wallet hops identified', 'Each hop forwarded >98% of received funds', 'Time between hops: 2–6 hours'],
      analysisRule: 'MULTI_HOP_DETECTOR_v1', dataSource: 'DEMO',
    },
    confidence: { level: 'HIGH', score: 79, basis: ['Sequential forwarding', 'Minimal retention', 'Timed intervals'] },
    isDemo: true,
  },
  {
    _id: 'df-5', findingType: 'HIGH_VELOCITY', severity: 'MEDIUM',
    title: 'High Transaction Velocity',
    explanation: 'The reported wallet executed an unusually high number of outgoing transfers within a short time window.',
    evidence: {
      observations: ['5 outgoing transfers within 14 hours', 'Average interval: 2.8 hours', 'All transfers directed to new counterparties'],
      analysisRule: 'VELOCITY_DETECTOR_v1', dataSource: 'DEMO',
    },
    confidence: { level: 'MEDIUM', score: 71, basis: ['Transaction count', 'Time window', 'Counterparty diversity'] },
    isDemo: true,
  },
];

// ── Main Graph Page ────────────────────────────────────────────────────────────
export default function GraphPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const caseId = searchParams.get('caseId');
  const invId  = searchParams.get('invId');
  const cyRef  = useRef(null);
  const cyInst = useRef(null);

  const [loading, setLoading]           = useState(true);
  const [analyzing, setAnalyzing]       = useState(false);
  const [error, setError]               = useState('');
  const [graphData, setGraphData]       = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  // Initialised synchronously — no async, no API needed, always available on first render
  const [preloadedFindings, setPreloadedFindings] = useState(DEMO_FINDINGS_FALLBACK);
  const [preloadedRisk, setPreloadedRisk]         = useState({ level: 'HIGH', indicators: DEMO_FINDINGS_FALLBACK.map(f => f.title) });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isDemo, setIsDemo]             = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [filterSuspicious, setFilterSuspicious] = useState(false);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    setGraphData(null);
    // Always use demo-inv-mongo-0001 as the canonical demo investigation ID
    const targetInvId = invId || 'demo-inv-mongo-0001';
    try {
      const res = await api.get(`/investigations/${targetInvId}/graph`);
      const data = res.data.data;
      setGraphData(data);
      setIsDemo(!!data.isDemo);
      setError('');
    } catch {
      // First request failed — try the stable demo fallback directly
      try {
        const r2 = await api.get('/investigations/demo-inv-mongo-0001/graph');
        const data = r2.data.data;
        setGraphData(data);
        setIsDemo(true);
        setError('');
      } catch (e2) {
        setError('Graph data unavailable. Check server connection.');
      }
    } finally { setLoading(false); }
  }, [invId]);

  const runAnalysis = async () => {
    if (!graphData?.nodes?.length) return;
    const rootNode = graphData.nodes.find(n => n.data.isOriginal) || graphData.nodes[0];
    if (!rootNode) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/investigations/analyze', {
        address: rootNode.data.fullAddress || rootNode.data.id,
        chain: rootNode.data.chain || 'TRON',
        token: 'USDT',
        maxHops: 4,
        caseId,
      });
      setAnalysisData(res.data.data);
      setShowFindings(true);
      toast.success(`Analysis complete: ${res.data.data.findings?.length} findings, risk ${res.data.data.risk?.level}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Analysis failed.');
    } finally { setAnalyzing(false); }
  };

  // Upgrade preloaded findings from API if available (optional enhancement)
  useEffect(() => {
    const targetInvId = invId || 'demo-inv-mongo-0001';
    api.get(`/investigations/${targetInvId}/findings`)
      .then(res => {
        const fs = res.data?.data?.findings || [];
        if (fs.length > 0) {
          setPreloadedFindings(fs);
          const hasCritical = fs.some(f => f.severity === 'CRITICAL');
          const highCount   = fs.filter(f => f.severity === 'HIGH').length;
          const level = hasCritical || highCount >= 2 ? 'HIGH' : highCount === 1 ? 'MEDIUM' : 'LOW';
          setPreloadedRisk({ level, indicators: fs.map(f => f.title || f.findingType) });
        }
      })
      .catch(() => { /* keep synchronous fallback already in state */ });
  }, [invId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Initialize / re-render Cytoscape
  useEffect(() => {
    if (!graphData || !cyRef.current) return;

    const elements = [
      ...graphData.nodes,
      ...graphData.edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          amountLabel: e.data.amount
            ? `${parseFloat(e.data.amount) >= 1000 ? (parseFloat(e.data.amount)/1000).toFixed(0)+'K' : parseFloat(e.data.amount).toFixed(0)} ${e.data.token || 'USDT'}`
            : '',
        },
      })),
    ];

    cyInst.current?.destroy();

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: CY_STYLE,
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.8,
        roots: graphData.nodes.filter(n => n.data.isOriginal).map(n => `#${n.data.id}`),
      },
      minZoom: 0.15,
      maxZoom: 5,
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', e => { setSelectedNode(e.target); setSelectedEdge(null); });
    cy.on('tap', 'edge', e => { setSelectedEdge(e.target); setSelectedNode(null); });
    cy.on('tap', e => { if (e.target === cy) { setSelectedNode(null); setSelectedEdge(null); } });

    cyInst.current = cy;
  }, [graphData]);

  // Highlight suspicious nodes when filter toggled
  useEffect(() => {
    if (!cyInst.current) return;
    cyInst.current.nodes().removeClass('suspicious');
    if (filterSuspicious) {
      const suspiciousTypes = ['REPORTED_SUSPECT', 'MULE', 'INTERMEDIARY', 'MIXER_PRIVACY'];
      cyInst.current.nodes().filter(n => suspiciousTypes.includes(n.data('type'))).addClass('suspicious');
    }
  }, [filterSuspicious, graphData]);

  const fitGraph  = () => cyInst.current?.fit(undefined, 50);
  const zoomIn    = () => { const cy = cyInst.current; if (!cy) return; cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cyRef.current.clientWidth/2, y: cyRef.current.clientHeight/2 }}); };
  const zoomOut   = () => { const cy = cyInst.current; if (!cy) return; cy.zoom({ level: cy.zoom() * 0.75, renderedPosition: { x: cyRef.current.clientWidth/2, y: cyRef.current.clientHeight/2 }}); };

  // Use live analysis data when available, fall back to preloaded findings from DB
  const findings = analysisData?.findings?.length > 0 ? analysisData.findings : preloadedFindings;
  const risk     = analysisData?.risk || (findings.length > 0 ? preloadedRisk : null);
  const hasInspector = selectedNode || selectedEdge;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Graph Workspace"
        subtitle={caseId ? `Case Investigation` : 'Transaction Graph — Fund Flow Analysis'}
        showDemoMode={isDemo}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadGraph}>Reload</Button>
            <Button
              size="sm"
              variant={filterSuspicious ? 'danger' : 'secondary'}
              icon={filterSuspicious ? EyeOff : Eye}
              onClick={() => setFilterSuspicious(v => !v)}
            >
              {filterSuspicious ? 'All Nodes' : 'Suspicious'}
            </Button>
            <Button
              size="sm"
              variant={showFindings ? 'primary' : 'secondary'}
              icon={Shield}
              onClick={() => setShowFindings(v => !v)}
              title={findings.length > 0 ? `${findings.length} investigation finding${findings.length !== 1 ? 's' : ''}` : 'Investigation Findings'}
            >
              Findings {findings.length > 0 ? `(${findings.length})` : ''}
            </Button>
            <Button size="sm" icon={Play} loading={analyzing} onClick={runAnalysis}>
              Analyze
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div className="flex-1 relative bg-[var(--bg-primary)]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--bg-primary)]">
              <div className="text-center">
                <Spinner size={28} className="mx-auto mb-3" />
                <p className="text-xs text-[var(--text-muted)]">Loading transaction graph…</p>
              </div>
            </div>
          )}
          {!loading && error && !graphData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState icon={Network} title="Graph Unavailable" description={error} action={<Button size="sm" onClick={loadGraph} icon={RefreshCw}>Retry</Button>} />
            </div>
          )}

          <div ref={cyRef} className="w-full h-full" />

          {/* Controls */}
          {!loading && graphData && (
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
              {[{ icon: ZoomIn, action: zoomIn }, { icon: ZoomOut, action: zoomOut }, { icon: Maximize2, action: fitGraph }].map(({ icon: Icon, action }, i) => (
                <button key={i} onClick={action} className="w-8 h-8 flex items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <Icon size={13} />
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          {!loading && graphData && (
            <div className="absolute top-4 left-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-3 text-[10px]">
              <p className="text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-2">Node Types</p>
              {[
                { color: '#f85149', label: 'Reported Suspect' },
                { color: '#d29922', label: 'Intermediary / Mule' },
                { color: '#bc8cff', label: 'Possible VASP ◆' },
                { color: '#3d444d', label: 'Unknown' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <div className="w-3 h-3 rounded-sm border" style={{ borderColor: color, backgroundColor: `${color}20` }} />
                  <span style={{ color }} className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Risk badge overlay */}
          {risk && (
            <div className="absolute bottom-4 right-4">
              <div className={`px-3 py-2 rounded border text-xs font-semibold ${risk.level === 'HIGH' ? 'bg-[#f8514920] border-[#f85149] text-[var(--accent-red)]' : risk.level === 'MEDIUM' ? 'bg-[#d2992220] border-[#d29922] text-[var(--accent-orange)]' : 'bg-[#3fb95020] border-[#3fb950] text-[var(--accent-green)]'}`}>
                Investigation Priority: {risk.level}
              </div>
            </div>
          )}

          {/* Demo banner */}
          {isDemo && !loading && (
            <div className="absolute top-4 right-4 bg-[#d2992220] border border-[#d2992250] rounded px-3 py-2 text-[10px] text-[var(--accent-orange)] font-medium">
              ⚠ DEMO DATA — Simulated investigation graph
            </div>
          )}
        </div>

        {/* Right panel — findings panel whenever showFindings is true */}
        {showFindings && (
          <FindingsSidebar
            findings={findings}
            risk={risk}
            isDemo={isDemo}
            onClose={() => setShowFindings(false)}
            onNodeSelect={(address) => {
              const node = cyInst.current?.getElementById(address);
              if (node?.length) { setSelectedNode(node); setShowFindings(false); }
            }}
          />
        )}
        {!showFindings && hasInspector && (
          selectedNode
            ? <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} navigate={navigate} />
            : <EdgeInspector edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
        )}
      </div>
    </div>
  );
}
