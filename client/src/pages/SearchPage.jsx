import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Network, FolderOpen } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, Spinner, EmptyState } from '../components/ui/Panel.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, RiskBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { Input } from '../components/ui/Input.jsx';
import api from '../services/api.js';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const [casesRes, walletsRes] = await Promise.all([
        api.get(`/cases?search=${encodeURIComponent(query)}&limit=10`),
        api.get(`/wallets?limit=10`),
      ]);
      setResults({
        cases: casesRes.data.data?.cases || [],
        wallets: walletsRes.data.data?.wallets?.filter(w =>
          w.address.toLowerCase().includes(query.toLowerCase())
        ) || [],
      });
    } catch (_) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalResults = (results?.cases?.length || 0) + (results?.wallets?.length || 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Search" subtitle="Search cases, wallets, and transactions" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Enter wallet address, case ID, transaction hash, or VASP name..."
            icon={Search}
            containerClass="flex-1"
          />
          <Button onClick={doSearch} loading={loading}>Search</Button>
        </div>

        {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
        {loading && <div className="flex justify-center py-12"><Spinner size={20} /></div>}

        {results && !loading && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for <strong className="text-[var(--text-primary)]">"{query}"</strong>
            </p>

            {results.cases.length > 0 && (
              <Panel title="Cases">
                <div className="space-y-2">
                  {results.cases.map(c => (
                    <button key={c._id} onClick={() => navigate(`/cases/${c._id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[var(--bg-elevated)] transition-colors text-left">
                      <FolderOpen size={14} className="text-[var(--accent-blue)] shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-[var(--text-primary)]">{c.caseName}</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-2">{c.caseId}</span>
                      </div>
                      <RiskBadge level={c.priority} />
                      <StatusBadge status={c.status} />
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {results.wallets.length > 0 && (
              <Panel title="Wallets">
                <div className="space-y-2">
                  {results.wallets.map(w => (
                    <div key={w._id} className="flex items-center gap-3 px-3 py-2.5 rounded bg-[var(--bg-elevated)]">
                      <Network size={14} className="text-[var(--accent-orange)] shrink-0" />
                      <span className="font-mono text-xs text-[var(--text-primary)] flex-1">{w.address}</span>
                      <Badge variant="blue">{w.blockchain}</Badge>
                      <RiskBadge level={w.riskLevel} />
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {totalResults === 0 && (
              <EmptyState icon={Search} title="No results found" description={`No cases or wallets match "${query}".`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
