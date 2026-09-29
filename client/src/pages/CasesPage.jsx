import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search, Filter, ArrowRight, ChevronDown } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, EmptyState, Spinner } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { RiskBadge, StatusBadge, Badge, DemoBanner } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Interactive.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'ACTIVE', 'UNDER_REVIEW', 'PENDING_VASP', 'ESCALATED', 'CLOSED', 'ARCHIVED'];
const BLOCKCHAINS = ['TRON', 'ETHEREUM', 'BITCOIN', 'UNKNOWN'];

// Embedded demo case — shown when the API is unreachable (rate-limited, server down, no DB)
const DEMO_CASE_FALLBACK = [{
  _id: 'demo-case-mongo-0001',
  caseId: 'SIH-2026-DEMO1',
  caseName: 'Demo Investigation — TRC-20 USDT Fraud',
  description: 'Victim-reported TRON wallet suspected of receiving fraudulent USDT transfers. Multi-hop fund movement to possible VASP detected.',
  status: 'ACTIVE',
  priority: 'HIGH',
  createdBy: { username: 'admin', fullName: 'System Admin' },
  assignedTo: { username: 'investigator1', fullName: 'Lead Investigator' },
  victimInfo: { reportedWallet: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', blockchain: 'TRON', asset: 'USDT (TRC-20)', estimatedLoss: '50000' },
  isDemo: true,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
}];

function CreateCaseModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    caseName: '', description: '', priority: 'MEDIUM',
    victimInfo: { reportedWallet: '', blockchain: 'TRON', asset: 'USDT (TRC-20)', ncrbComplaintNumber: '', estimatedLoss: '', victimDescription: '' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setVictim = (field, val) => setForm(f => ({ ...f, victimInfo: { ...f.victimInfo, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caseName.trim()) { setError('Case name is required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/cases', form);
      onCreated(res.data.data.case);
      onClose();
      setForm({ caseName: '', description: '', priority: 'MEDIUM', victimInfo: { reportedWallet: '', blockchain: 'TRON', asset: 'USDT (TRC-20)', ncrbComplaintNumber: '', estimatedLoss: '', victimDescription: '' } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Create New Investigation Case" size="lg">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <div className="text-xs text-[var(--accent-red)] bg-[#f8514910] border border-[#f8514940] rounded px-3 py-2">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Case Name *" value={form.caseName} onChange={e => set('caseName', e.target.value)} placeholder="e.g. TRC-20 USDT Fraud 2026-001" containerClass="col-span-2" />
          <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief case description" containerClass="col-span-2" />
          <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="NCRP / Complaint Reference" value={form.victimInfo.ncrbComplaintNumber} onChange={e => setVictim('ncrbComplaintNumber', e.target.value)} placeholder="NCRP-XXXX-XXXX" />
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Victim-Reported Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reported Suspect Wallet" value={form.victimInfo.reportedWallet} onChange={e => setVictim('reportedWallet', e.target.value)} placeholder="Wallet address" containerClass="col-span-2" hint="The original wallet address reported by the victim" />
            <Select label="Blockchain" value={form.victimInfo.blockchain} onChange={e => setVictim('blockchain', e.target.value)}>
              {BLOCKCHAINS.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
            <Input label="Asset" value={form.victimInfo.asset} onChange={e => setVictim('asset', e.target.value)} placeholder="e.g. USDT (TRC-20)" />
            <Input label="Estimated Loss" value={form.victimInfo.estimatedLoss} onChange={e => setVictim('estimatedLoss', e.target.value)} placeholder="Amount" />
            <Input label="Victim Description" value={form.victimInfo.victimDescription} onChange={e => setVictim('victimDescription', e.target.value)} placeholder="Brief description of incident" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Case</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CasesPage() {
  const navigate = useNavigate();
  // allCases holds the full unfiltered list fetched from the API (or demo fallback).
  // Filtering is done client-side so it works instantly for both live and demo data.
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [creatingDemo, setCreatingDemo] = useState(false);

  // ── Client-side filter applied to whatever allCases contains ──────────────
  const cases = allCases.filter(c => {
    if (statusFilter   && c.status   !== statusFilter)   return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [c.caseId, c.caseName, c.description,
                        c.victimInfo?.reportedWallet, c.assignedTo?.fullName,
                        c.assignedTo?.username].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const loadCases = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch the full list without server-side filters so client-side filtering
      // always has the complete dataset to work with.
      const params = new URLSearchParams({ page, limit: 100 });
      const res = await api.get(`/cases?${params}`);
      setAllCases(res.data.data.cases);
    } catch (err) {
      // Any API failure in demo/dev → show embedded demo case instead of an error
      // Covers: 503 (no DB), 429 (rate limit), network error, server restart
      const status = err.response?.status;
      if (status === 429 || status === 503 || !status) {
        setAllCases(DEMO_CASE_FALLBACK);
      } else {
        setError('Failed to load cases. Check server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Only re-fetch from the server when the page changes.
  // Filter/search changes are handled purely client-side.
  useEffect(() => { loadCases(); }, [page]);

  // Reset to page 1 whenever a filter or search term changes.
  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, search]);

  const createDemo = async () => {
    setCreatingDemo(true);
    try {
      const res = await api.post('/cases/demo/create');
      navigate(`/cases/${res.data.data.case._id}`);
    } catch (err) {
      // If API is unavailable, navigate directly to the known demo case ID
      navigate('/cases/demo-case-mongo-0001');
    } finally {
      setCreatingDemo(false);
    }
  };

  const total = cases.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Cases"
        subtitle={`${total} investigation${total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" loading={creatingDemo} onClick={createDemo}>
              Load Demo Case
            </Button>
            <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
              New Case
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cases..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36 text-xs h-8">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-36 text-xs h-8">
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>

        {error && <div className="text-xs text-[var(--accent-red)] bg-[#f8514910] border border-[#f8514940] rounded px-3 py-2">{error}</div>}

        {/* Cases table */}
        <div className="panel overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size={20} /></div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No cases found"
              description={
                statusFilter || priorityFilter || search.trim()
                  ? 'No cases match the current filters. Try adjusting Status, Priority, or Search.'
                  : 'Create a new investigation case or load the demo to get started.'
              }
              action={
                <div className="flex gap-3">
                  <Button size="sm" onClick={createDemo} loading={creatingDemo}>Load Demo Case</Button>
                  <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>New Case</Button>
                </div>
              }
            />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {['Case ID', 'Case Name', 'Blockchain', 'Priority', 'Status', 'Assigned To', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/cases/${c._id}`)}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--text-muted)]">{c.caseId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{c.caseName}</span>
                        {c.isDemo && <Badge variant="demo" size="xs">DEMO</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{c.victimInfo?.blockchain || '—'}</td>
                    <td className="px-4 py-3"><RiskBadge level={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{c.assignedTo?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3"><ArrowRight size={13} className="text-[var(--text-muted)]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateCaseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={c => { setAllCases(prev => [c, ...prev]); navigate(`/cases/${c._id}`); }} />
    </div>
  );
}
