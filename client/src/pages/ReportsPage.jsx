import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Download, AlertTriangle, ChevronRight, Network } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, Spinner, EmptyState } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, SeverityBadge, ConfidenceBadge, DemoBanner } from '../components/ui/Badge.jsx';
import { Select } from '../components/ui/Input.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId');
  const invIdParam = searchParams.get('invId');
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam || '');
  const [investigations, setInvestigations] = useState([]);
  const [selectedInvId, setSelectedInvId] = useState(invIdParam || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/cases?limit=50').then(r => setCases(r.data.data?.cases || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    api.get(`/investigations?caseId=${selectedCaseId}`).then(r => {
      setInvestigations(r.data.data?.investigations || []);
      if (!selectedInvId && r.data.data?.investigations?.[0]) {
        setSelectedInvId(r.data.data.investigations[0]._id);
      }
    }).catch(() => {});
  }, [selectedCaseId]);

  // Auto-generate if params provided
  useEffect(() => {
    if (caseIdParam && invIdParam) generateReport(caseIdParam, invIdParam);
  }, []);

  const generateReport = async (cId, iId) => {
    const caseId = cId || selectedCaseId || 'demo-case-mongo-0001';
    const invId = iId || selectedInvId || 'demo-inv-mongo-0001';
    setLoading(true); setError(''); setReport(null);
    try {
      const res = await api.post('/reports/generate', { caseId, investigationId: invId });
      setReport(res.data.data.report);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Investigation Reports" subtitle="Generate and review investigation reports" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Report selector */}
        <Panel title="Generate Report">
          <div className="flex gap-3 flex-wrap items-end">
            <Select label="Case" value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)} containerClass="flex-1 min-w-48">
              <option value="">Select case...</option>
              {cases.map(c => <option key={c._id} value={c._id}>{c.caseName} ({c.caseId})</option>)}
            </Select>
            <Select label="Investigation" value={selectedInvId} onChange={e => setSelectedInvId(e.target.value)} containerClass="flex-1 min-w-48">
              <option value="">Select investigation...</option>
              {investigations.map(i => <option key={i._id} value={i._id}>{i.status} — {format(new Date(i.createdAt), 'dd MMM yyyy HH:mm')}</option>)}
            </Select>
            <Button onClick={() => generateReport()} loading={loading} icon={FileText}>
              Generate Report
            </Button>
          </div>
          {error && <p className="text-xs text-[var(--accent-red)] mt-3 flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </Panel>

        {loading && (
          <div className="flex justify-center py-12"><Spinner size={24} /></div>
        )}

        {report && <ReportView report={report} />}
      </div>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">{title}</h2>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      {children}
    </div>
  );
}

function ReportView({ report }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-5 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              Investigation Report
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">{report.caseInformation?.caseName}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Case ID: {report.caseInformation?.caseId}</p>
          </div>
          <div className="text-right">
            {report.isDemo && <DemoBanner className="mb-2" />}
            <p className="text-xs text-[var(--text-muted)]">Generated: {format(new Date(report.generatedAt), 'dd MMM yyyy HH:mm')}</p>
            <p className="text-xs text-[var(--text-muted)]">By: {report.generatedBy}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <ReportSection title="Case Information">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['Case ID', report.caseInformation?.caseId],
              ['Status', report.caseInformation?.status],
              ['Priority', report.caseInformation?.priority],
              ['Investigator', report.caseInformation?.createdBy],
              ['Assigned To', report.caseInformation?.assignedTo],
              ['Created', report.caseInformation?.createdAt ? format(new Date(report.caseInformation.createdAt), 'dd MMM yyyy') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[var(--bg-elevated)] rounded p-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-xs font-medium text-[var(--text-primary)]">{value || '—'}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Input — Victim Reported Information">
          <div className="bg-[var(--bg-elevated)] rounded p-4 space-y-2">
            {[
              ['Reported Wallet', <span className="font-mono text-[var(--accent-blue)] text-[11px]">{report.input?.reportedWallet}</span>],
              ['Blockchain', report.input?.blockchain],
              ['Asset', report.input?.asset],
              ['NCRP Reference', report.input?.ncrbReference],
              ['Estimated Loss', report.input?.estimatedLoss],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                <span className="text-xs text-[var(--text-primary)]">{value || '—'}</span>
              </div>
            ))}
          </div>
        </ReportSection>

        {report.investigationSummary && (
          <ReportSection title="Investigation Summary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                ['Risk Level', <RiskBadge level={report.investigationSummary.riskLevel} />],
                ['Wallets Analyzed', report.investigationSummary.walletsAnalyzed],
                ['Transactions', report.investigationSummary.transactionsAnalyzed],
                ['Patterns Found', report.investigationSummary.patternsFound],
              ].map(([label, value]) => (
                <div key={label} className="bg-[var(--bg-elevated)] rounded p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{value ?? '—'}</div>
                </div>
              ))}
            </div>
            {report.investigationSummary.riskIndicators?.length > 0 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-2">Risk Indicators</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.investigationSummary.riskIndicators.map(r => (
                    <span key={r} className="text-[10px] px-2 py-0.5 bg-[#f8514910] text-[var(--accent-red)] rounded border border-[#f8514930]">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {report.findings?.length > 0 && (
          <ReportSection title="Findings & Analysis">
            <div className="space-y-3">
              {report.findings.map((f, i) => (
                <div key={i} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</h3>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      {f.confidence?.level && <ConfidenceBadge level={f.confidence.level} />}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{f.explanation}</p>
                  {f.evidence?.observations?.length > 0 && (
                    <ul className="space-y-0.5">
                      {f.evidence.observations.map((o, j) => (
                        <li key={j} className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                          <span className="text-[var(--accent-green)] mt-0.5">•</span>{o}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {report.walletAnalysis?.length > 0 && (
          <ReportSection title="Wallet Intelligence Analysis">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {['Address', 'Classification', 'Risk', 'Hop', 'Txs', 'VASP Attribution'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.walletAnalysis.map((w, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--accent-blue)]">{w.address ? `${w.address.substring(0,10)}…${w.address.slice(-6)}` : '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{w.classification?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-3 py-2"><RiskBadge level={w.riskLevel} /></td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">{w.hopDepth ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{w.transactionCount ?? '—'}</td>
                      <td className="px-3 py-2">
                        {w.vaspAttribution ? (
                          <div>
                            <span className="text-[var(--accent-purple)] font-medium">{w.vaspAttribution.vasp}</span>
                            <Badge variant="purple" size="xs" className="ml-1">{w.vaspAttribution.type}</Badge>
                            <ConfidenceBadge level={w.vaspAttribution.confidence} className="mt-0.5" />
                          </div>
                        ) : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-3 px-1">⚠ VASP attribution is analytical intelligence. Does not constitute confirmed identity. Verify through official LEA coordination.</p>
          </ReportSection>
        )}

        {report.transactionTimeline?.length > 0 && (
          <ReportSection title="Transaction Timeline">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {['Tx Hash', 'From', 'To', 'Amount', 'Token', 'Timestamp', 'Source'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[var(--text-muted)] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.transactionTimeline.slice(0, 15).map((tx, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--accent-blue)]">{tx.hash ? `${tx.hash.substring(0,10)}…` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)]">{tx.from ? `${tx.from.substring(0,8)}…` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)]">{tx.to ? `${tx.to.substring(0,8)}…` : '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{tx.amount ? Number(tx.amount).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">{tx.token || '—'}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap">{tx.timestamp ? format(new Date(tx.timestamp), 'dd MMM HH:mm') : '—'}</td>
                      <td className="px-3 py-2">
                        {tx.dataSource === 'DEMO' ? <Badge variant="demo" size="xs">DEMO</Badge> : <Badge variant="green" size="xs">{tx.dataSource || 'DB'}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        )}

        {report.recommendations?.length > 0 && (
          <ReportSection title="Recommended Investigative Actions">
            <div className="space-y-2">
              {report.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)]">
                  <span className="text-[var(--accent-blue)] text-xs font-bold shrink-0">{i + 1}.</span>
                  <p className="text-xs text-[var(--text-primary)]">{r}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-3">Recommendations are advisory. Do not constitute legal directives.</p>
          </ReportSection>
        )}

        <ReportSection title="Limitations & Disclaimer">
          <div className="bg-[#d2992210] border border-[#d2992230] rounded p-4 space-y-2">
            {report.limitations?.map((l, i) => (
              <p key={i} className="text-xs text-[var(--accent-orange)] flex items-start gap-2">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />{l}
              </p>
            ))}
            <p className="text-[11px] text-[var(--text-muted)] border-t border-[#d2992230] pt-2 mt-2">
              {report.disclaimer}
            </p>
          </div>
        </ReportSection>
      </div>
    </div>
  );
}
