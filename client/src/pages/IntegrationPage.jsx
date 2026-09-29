/**
 * NCRP / SAHYOG / LEA Integration Page — Stage 14
 *
 * Architecture-ready integration interface for law-enforcement workflows.
 *
 * IMPORTANT DISCLAIMER:
 * This page provides an integration-ready architecture and mock/demo workflow.
 * Actual NCRP/SAHYOG API integration requires authorized government API access
 * which is NOT available in this prototype. The flow below clearly labels
 * all government API interactions as MOCK/ARCHITECTURE-READY.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, FileText, Send, CheckCircle, AlertTriangle,
  ArrowRight, ExternalLink, Building, Network, Copy, CheckCheck,
  Download, X, Loader,
} from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Select } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Integration status card definitions ──────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'ncrp',
    name: 'NCRP / National Cyber Crime Reporting Portal',
    description: 'Intake of cyber-fraud complaints from NCRP for automated blockchain investigation.',
    status: 'ARCHITECTURE_READY',
    statusLabel: 'Architecture Ready',
    statusColor: 'orange',
    endpoint: 'POST /api/integration/ncrp/intake',
    note: 'Requires authorized NCRP API credentials. Integration adapter is implemented and awaiting API access.',
    btnLabel: 'Simulate NCRP Intake',
  },
  {
    id: 'sahyog',
    name: 'SAHYOG Coordination Platform',
    description: 'Inter-agency information sharing for coordinated cyber-crime response.',
    status: 'ARCHITECTURE_READY',
    statusLabel: 'Architecture Ready',
    statusColor: 'orange',
    endpoint: 'POST /api/integration/sahyog/report',
    note: 'Requires authorized SAHYOG portal credentials.',
    btnLabel: 'Simulate SAHYOG Report',
  },
  {
    id: 'vasp_coord',
    name: 'VASP Coordination Request',
    description: 'Structured output package for sending to identified VASP/exchange for account information.',
    status: 'DEMO_READY',
    statusLabel: 'Demo Ready',
    statusColor: 'green',
    endpoint: 'POST /api/integration/vasp/coordinate',
    note: 'Output package generation is functional. Actual VASP delivery requires bilateral LEA coordination.',
    btnLabel: 'Generate Package',
  },
  {
    id: 'lea',
    name: 'LEA Case Export',
    description: 'Export investigation package in structured format for inter-agency handoff.',
    status: 'DEMO_READY',
    statusLabel: 'Demo Ready',
    statusColor: 'green',
    endpoint: 'GET /api/integration/lea/export/:caseId',
    note: 'Case export is fully functional in demo mode.',
    btnLabel: 'Export Case',
  },
];

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_NCRP_COMPLAINT = {
  complaintNumber:  'DEMO-NCRP-2026-001',
  reportedWallet:   'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  blockchain:       'TRON',
  asset:            'USDT (TRC-20)',
  estimatedLoss:    '50,000 USDT',
  incidentDate:     '2026-01-15',
  fraudType:        'Investment Fraud / Phishing',
  status:           'REFERRED_FOR_INVESTIGATION',
};

const DEMO_SAHYOG_REPORT = {
  referenceId:        'DEMO-SAHYOG-2026-0042',
  caseId:             'SIH-2026-DEMO1',
  investigationRef:   'demo-inv-mongo-0001',
  reportedWallet:     'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  blockchain:         'TRON',
  riskLevel:          'HIGH',
  findingsSummary:    'Rapid fund movement detected. 3-hop layering via intermediary wallets. Possible VASP deposit at final hop.',
  suspectedVasp:      'DemoExchange Platform (indirect attribution, medium confidence)',
  hopsTraced:         3,
  coordinationStatus: 'SUBMITTED_FOR_REVIEW',
  submittedAt:        new Date().toISOString(),
};

// ── Small utilities ───────────────────────────────────────────────────────────
function CopyBtn({ text, label = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
    >
      {copied ? <CheckCheck size={11} className="text-[var(--accent-green)]" /> : <Copy size={11} />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}

function KVRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-[var(--border-subtle)] last:border-0 gap-4">
      <span className="text-[11px] text-[var(--text-muted)] shrink-0 capitalize">
        {label.replace(/([A-Z])/g, ' $1').trim()}
      </span>
      <span className={`text-[11px] text-[var(--text-primary)] font-medium text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ── NCRP modal ────────────────────────────────────────────────────────────────
function NcrpModal({ open, onClose }) {
  const [step, setStep]     = useState('idle'); // idle | loading | done
  const [result, setResult] = useState(null);

  const runSimulation = async () => {
    setStep('loading');
    await new Promise(r => setTimeout(r, 1000)); // simulate network call
    setResult({
      ...DEMO_NCRP_COMPLAINT,
      intakeTimestamp: new Date().toISOString(),
      caseCreated:     'SIH-2026-DEMO1',
      assignedTo:      'investigator1',
    });
    setStep('done');
  };

  const handleClose = () => { setStep('idle'); setResult(null); onClose(); };

  return (
    <Modal isOpen={open} onClose={handleClose} title="NCRP Intake — Demo Simulation" size="md">
      <div className="p-5 space-y-4">
        {/* Disclaimer banner */}
        <div className="flex items-start gap-2 p-3 rounded bg-[#d2992215] border border-[#d2992235]">
          <AlertTriangle size={13} className="text-[var(--accent-orange)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--accent-orange)]">
            <strong>DEMO / MOCK DATA</strong> — No real NCRP API was contacted.
            Real integration requires authorized government API credentials.
          </p>
        </div>

        {step === 'idle' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              This simulation demonstrates how ChainTrace would receive a cyber-fraud complaint
              from the NCRP portal and automatically create an investigation case.
            </p>
            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Incoming complaint data</p>
              {Object.entries(DEMO_NCRP_COMPLAINT).map(([k, v]) => (
                <KVRow key={k} label={k} value={v} mono={k.includes('Wallet') || k.includes('Hash')} />
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button icon={Send} onClick={runSimulation}>Simulate Intake</Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader size={22} className="text-[var(--accent-blue)] animate-spin" />
            <p className="text-xs text-[var(--text-secondary)]">Simulating NCRP API intake…</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--accent-green)]">
              <CheckCircle size={15} />
              <span className="text-xs font-semibold">Intake simulation successful</span>
              <Badge variant="demo" size="xs" className="ml-auto">MOCK DATA</Badge>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              {Object.entries(result).map(([k, v]) => (
                <KVRow key={k} label={k} value={String(v)} mono={k.includes('Wallet') || k.includes('Ref') || k.includes('Id')} />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <CopyBtn text={JSON.stringify(result, null, 2)} label="Copy JSON" />
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── SAHYOG modal ──────────────────────────────────────────────────────────────
function SahyogModal({ open, onClose }) {
  const [step, setStep]     = useState('idle');
  const [result, setResult] = useState(null);

  const runSimulation = async () => {
    setStep('loading');
    await new Promise(r => setTimeout(r, 1100));
    setResult({ ...DEMO_SAHYOG_REPORT });
    setStep('done');
  };

  const handleClose = () => { setStep('idle'); setResult(null); onClose(); };

  return (
    <Modal isOpen={open} onClose={handleClose} title="SAHYOG Coordination — Demo Simulation" size="md">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded bg-[#d2992215] border border-[#d2992235]">
          <AlertTriangle size={13} className="text-[var(--accent-orange)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--accent-orange)]">
            <strong>DEMO / ARCHITECTURE READY</strong> — No real SAHYOG system was contacted.
            Real integration requires authorized portal credentials.
          </p>
        </div>

        {step === 'idle' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              This simulation demonstrates how ChainTrace would submit a coordination report
              to the SAHYOG inter-agency platform with investigation intelligence.
            </p>
            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Outgoing coordination report</p>
              {Object.entries(DEMO_SAHYOG_REPORT).map(([k, v]) => (
                <KVRow key={k} label={k} value={String(v)} />
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button icon={Send} onClick={runSimulation}>Simulate Submission</Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader size={22} className="text-[var(--accent-blue)] animate-spin" />
            <p className="text-xs text-[var(--text-secondary)]">Simulating SAHYOG report submission…</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--accent-green)]">
              <CheckCircle size={15} />
              <span className="text-xs font-semibold">Coordination report submitted (simulation)</span>
              <Badge variant="demo" size="xs" className="ml-auto">MOCK DATA</Badge>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              {Object.entries(result).map(([k, v]) => (
                <KVRow key={k} label={k} value={String(v)} />
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Architecture ready. Real SAHYOG API endpoint can be wired to <code className="font-mono">POST /api/integration/sahyog/report</code> once credentials are provisioned.
            </p>
            <div className="flex justify-between items-center">
              <CopyBtn text={JSON.stringify(result, null, 2)} label="Copy JSON" />
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── VASP coordination modal ───────────────────────────────────────────────────
function VaspModal({ open, onClose }) {
  const [cases, setCases]   = useState([]);
  const [selected, setSelected] = useState('');
  const [step, setStep]     = useState('idle');
  const [output, setOutput] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get('/cases?limit=20').then(r => setCases(r.data.data?.cases || [])).catch(() => {});
  }, [open]);

  const generate = async () => {
    setStep('loading');
    await new Promise(r => setTimeout(r, 900));
    const pkg = {
      packageType:         'VASP_COORDINATION_REQUEST',
      generatedAt:         new Date().toISOString(),
      caseReference:       selected || 'SIH-2026-DEMO1',
      requestingAgency:    'CyberCrime Investigation Unit — SIH26183',
      suspectedVasp:       'DemoExchange Platform',
      attributionType:     'INDIRECT',
      attributionConfidence: 'MEDIUM',
      reportedWallet:      'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
      suspectedVaspWallet: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF',
      blockchain:          'TRON',
      asset:               'USDT (TRC-20)',
      totalAmount:         '49,600 USDT',
      transactionHashes:   [
        'd4e5f6789012345678901234567890123456cdef1234567890abcdef12345679',
        'e5f678901234567890123456789012345678def1234567890abcdef1234567a0',
      ],
      requestType:         'ACCOUNT_INFORMATION_REQUEST',
      requestedInformation: ['Account holder identity', 'KYC documents', 'Transaction records'],
      legalBasis:          '[Insert applicable legal authority — MLAT / domestic LEA process]',
      isDemo:              true,
      disclaimer:          'DEMO PACKAGE. Attribution is analytical. Verification required before any legal action.',
    };
    setOutput(pkg);
    setStep('done');
    toast.success('VASP coordination package generated (DEMO)');
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vasp-coordination-package-demo.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => { setStep('idle'); setOutput(null); onClose(); };

  return (
    <Modal isOpen={open} onClose={handleClose} title="VASP Coordination Package Generator" size="lg">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded bg-[#3fb95015] border border-[#3fb95030]">
          <Shield size={13} className="text-[var(--accent-green)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--accent-green)]">
            <strong>DEMO READY</strong> — Package generation is functional.
            Actual VASP delivery requires bilateral LEA coordination.
          </p>
        </div>

        {step !== 'done' && (
          <div className="flex items-end gap-3">
            <Select
              label="Case"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              containerClass="flex-1"
            >
              <option value="">— Demo case (SIH-2026-DEMO1) —</option>
              {cases.map(c => (
                <option key={c._id} value={c.caseId}>{c.caseId} — {c.caseName}</option>
              ))}
            </Select>
            <Button icon={Send} loading={step === 'loading'} onClick={generate}>
              Generate Package
            </Button>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader size={22} className="text-[var(--accent-blue)] animate-spin" />
            <p className="text-xs text-[var(--text-secondary)]">Generating VASP coordination package…</p>
          </div>
        )}

        {step === 'done' && output && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--accent-green)]">
              <CheckCircle size={15} />
              <span className="text-xs font-semibold">Package generated</span>
              <Badge variant="demo" size="xs" className="ml-auto">DEMO</Badge>
            </div>

            {/* Key fields summary */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Case Reference', output.caseReference],
                ['Suspected VASP', output.suspectedVasp],
                ['Attribution Type', output.attributionType],
                ['Confidence', output.attributionConfidence],
                ['Blockchain', output.blockchain],
                ['Asset', output.asset],
                ['Total Amount', output.totalAmount],
                ['Request Type', output.requestType],
              ].map(([l, v]) => (
                <div key={l} className="bg-[var(--bg-elevated)] rounded p-2">
                  <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{l}</p>
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">{v}</p>
                </div>
              ))}
            </div>

            {/* Wallets */}
            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              <KVRow label="Reported Wallet" value={output.reportedWallet} mono />
              <KVRow label="Suspected VASP Wallet" value={output.suspectedVaspWallet} mono />
              {output.transactionHashes.map((h, i) => (
                <KVRow key={h} label={`Transaction Hash ${i + 1}`} value={h.slice(0, 20) + '…'} mono />
              ))}
            </div>

            <p className="text-[10px] text-[var(--accent-orange)]">⚠ {output.disclaimer}</p>

            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-3">
                <CopyBtn text={JSON.stringify(output, null, 2)} label="Copy JSON" />
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
                >
                  <Download size={11} />
                  <span>Download JSON</span>
                </button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setStep('idle'); setOutput(null); }}>
                  Reset
                </Button>
                <Button size="sm" variant="secondary" onClick={handleClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── LEA export modal ──────────────────────────────────────────────────────────
function LeaModal({ open, onClose }) {
  const navigate    = useNavigate();
  const [cases, setCases]   = useState([]);
  const [selected, setSelected] = useState('');
  const [step, setStep]     = useState('idle');
  const [output, setOutput] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get('/cases?limit=20').then(r => setCases(r.data.data?.cases || [])).catch(() => {});
  }, [open]);

  const doExport = async () => {
    setStep('loading');
    try {
      const cId = selected || 'demo-case-mongo-0001';
      const [caseRes, repRes] = await Promise.allSettled([
        api.get(`/cases/${cId}`),
        api.post('/reports/generate', { caseId: cId, investigationId: 'demo-inv-mongo-0001' }),
      ]);
      const caseDoc = caseRes.status === 'fulfilled' ? caseRes.value.data.data?.case : null;
      const report  = repRes.status  === 'fulfilled' ? repRes.value.data.data?.report : null;
      const pkg = {
        exportType:      'LEA_INVESTIGATION_PACKAGE',
        exportedAt:      new Date().toISOString(),
        caseId:          caseDoc?.caseId   || 'SIH-2026-DEMO1',
        caseName:        caseDoc?.caseName || 'Demo Investigation — TRC-20 USDT Fraud',
        status:          caseDoc?.status   || 'ACTIVE',
        priority:        caseDoc?.priority || 'HIGH',
        reportedWallet:  caseDoc?.victimInfo?.reportedWallet || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        blockchain:      caseDoc?.victimInfo?.blockchain     || 'TRON',
        asset:           caseDoc?.victimInfo?.asset          || 'USDT (TRC-20)',
        riskLevel:       report?.investigationSummary?.riskLevel || 'HIGH',
        findings:        report?.findings?.length    ?? 3,
        wallets:         report?.walletAnalysis?.length ?? 5,
        transactions:    report?.transactionTimeline?.length ?? 5,
        reportIncluded:  !!report,
        isDemo:          true,
        disclaimer:      'DEMO EXPORT — Not for use in actual law-enforcement proceedings without proper chain-of-custody verification.',
      };
      setOutput(pkg);
      setStep('done');
      toast.success('LEA export package generated (DEMO)');
    } catch {
      setStep('idle');
      toast.error('Export failed. Check server connection.');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lea-export-${output.caseId}-demo.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => { setStep('idle'); setOutput(null); onClose(); };

  return (
    <Modal isOpen={open} onClose={handleClose} title="LEA Case Export Package" size="lg">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded bg-[#3fb95015] border border-[#3fb95030]">
          <Shield size={13} className="text-[var(--accent-green)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--accent-green)]">
            <strong>DEMO READY</strong> — Export package is fully functional in demo mode.
            Label as DEMO DATA when not in a production environment.
          </p>
        </div>

        {step !== 'done' && (
          <div className="flex items-end gap-3">
            <Select
              label="Case"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              containerClass="flex-1"
            >
              <option value="">— Demo case (demo-case-mongo-0001) —</option>
              {cases.map(c => (
                <option key={c._id} value={c._id}>{c.caseId} — {c.caseName}</option>
              ))}
            </Select>
            <Button icon={FileText} loading={step === 'loading'} onClick={doExport}>
              Generate Export
            </Button>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader size={22} className="text-[var(--accent-blue)] animate-spin" />
            <p className="text-xs text-[var(--text-secondary)]">Generating LEA export package…</p>
          </div>
        )}

        {step === 'done' && output && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--accent-green)]">
              <CheckCircle size={15} />
              <span className="text-xs font-semibold">Export package generated</span>
              <Badge variant="demo" size="xs" className="ml-auto">DEMO DATA</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ['Case ID',      output.caseId],
                ['Status',       output.status],
                ['Risk',         output.riskLevel],
                ['Priority',     output.priority],
                ['Findings',     output.findings],
                ['Wallets',      output.wallets],
                ['Transactions', output.transactions],
                ['Report',       output.reportIncluded ? 'Included' : 'Not generated'],
              ].map(([l, v]) => (
                <div key={l} className="bg-[var(--bg-elevated)] rounded p-2">
                  <p className="text-[10px] text-[var(--text-muted)] mb-0.5">{l}</p>
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-elevated)] rounded p-3 space-y-1">
              <KVRow label="Case Name"       value={output.caseName} />
              <KVRow label="Reported Wallet" value={output.reportedWallet} mono />
              <KVRow label="Blockchain"      value={output.blockchain} />
              <KVRow label="Asset"           value={output.asset} />
              <KVRow label="Exported At"     value={format(new Date(output.exportedAt), 'dd MMM yyyy HH:mm:ss')} />
            </div>

            <p className="text-[10px] text-[var(--accent-orange)]">⚠ {output.disclaimer}</p>

            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-3">
                <CopyBtn text={JSON.stringify(output, null, 2)} label="Copy JSON" />
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
                >
                  <Download size={11} />
                  <span>Download JSON</span>
                </button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={ArrowRight} onClick={() => { handleClose(); navigate('/reports'); }}>
                  View Reports
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setStep('idle'); setOutput(null); }}>
                  Reset
                </Button>
                <Button size="sm" variant="secondary" onClick={handleClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IntegrationPage() {
  const [openModal, setOpenModal] = useState(null); // 'ncrp' | 'sahyog' | 'vasp_coord' | 'lea'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="LEA / NCRP Integration"
        subtitle="Law-enforcement workflow integration — Architecture-ready"
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Critical disclaimer */}
        <div className="flex items-start gap-3 p-4 rounded border border-[#f85149] bg-[#f8514910]">
          <AlertTriangle size={16} className="text-[var(--accent-red)] mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">Integration Disclaimer</p>
            <p className="text-[var(--text-secondary)]">
              This page provides integration-ready architecture and demonstration workflows.
              Actual NCRP/SAHYOG API integration requires authorized government credentials
              which are not available in this prototype. All government API calls below
              are clearly labelled as <strong>MOCK</strong> or <strong>ARCHITECTURE-READY</strong>.
            </p>
          </div>
        </div>

        {/* NCRP Demo Intake Flow */}
        <Panel title="NCRP / SAHYOG — Demo Intake Flow">
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              In the production workflow, a complaint received at NCRP would be automatically routed
              to ChainTrace for blockchain investigation. The flow below demonstrates this architecture:
            </p>

            {/* Flow steps */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'NCRP Complaint',          status: 'DEMO',  color: 'orange' },
                { label: '→' },
                { label: 'Case Created',             status: 'LIVE',  color: 'green' },
                { label: '→' },
                { label: 'Wallet Submitted',         status: 'LIVE',  color: 'green' },
                { label: '→' },
                { label: 'Blockchain Investigation', status: 'LIVE',  color: 'green' },
                { label: '→' },
                { label: 'Intelligence Report',      status: 'LIVE',  color: 'green' },
                { label: '→' },
                { label: 'LEA Handoff',              status: 'DEMO',  color: 'orange' },
              ].map((s, i) => (
                s.label === '→'
                  ? <span key={i} className="text-[var(--text-muted)]">→</span>
                  : <div key={i} className="flex flex-col items-center">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded ${
                        s.color === 'green'
                          ? 'bg-[#3fb95020] text-[var(--accent-green)] border border-[#3fb95040]'
                          : 'bg-[#d2992220] text-[var(--accent-orange)] border border-[#d2992240]'
                      }`}>
                        {s.label}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] mt-0.5">{s.status}</span>
                    </div>
              ))}
            </div>

            {/* Demo complaint preview */}
            <div className="bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                  Demo NCRP Complaint
                </span>
                <Badge variant="demo">MOCK DATA</Badge>
              </div>
              <div className="grid grid-cols-2 gap-0">
                {Object.entries(DEMO_NCRP_COMPLAINT).map(([k, v]) => (
                  <KVRow key={k} label={k} value={v} mono={k.includes('Wallet')} />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATIONS.map(intg => (
            <div key={intg.id} className="panel p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building size={14} className="text-[var(--text-muted)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{intg.name}</span>
                </div>
                <Badge variant={intg.statusColor === 'green' ? 'green' : 'orange'} size="xs">
                  {intg.statusLabel}
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">{intg.description}</p>
              <code className="text-[10px] text-[var(--accent-blue)] font-mono bg-[var(--bg-overlay)] px-2 py-1 rounded">
                {intg.endpoint}
              </code>
              <p className="text-[10px] text-[var(--text-muted)]">{intg.note}</p>
              {/* Action button — always visible and always does something */}
              <div className="pt-1">
                <Button
                  size="sm"
                  variant={intg.statusColor === 'green' ? 'primary' : 'secondary'}
                  icon={Send}
                  onClick={() => setOpenModal(intg.id)}
                  className="w-full"
                >
                  {intg.btnLabel}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals — rendered outside the scroll container */}
      <NcrpModal  open={openModal === 'ncrp'}       onClose={() => setOpenModal(null)} />
      <SahyogModal open={openModal === 'sahyog'}    onClose={() => setOpenModal(null)} />
      <VaspModal  open={openModal === 'vasp_coord'} onClose={() => setOpenModal(null)} />
      <LeaModal   open={openModal === 'lea'}        onClose={() => setOpenModal(null)} />
    </div>
  );
}
