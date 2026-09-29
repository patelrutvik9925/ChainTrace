import { useEffect, useState } from 'react';
import { Database, Shield, AlertTriangle } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, EmptyState, Spinner } from '../components/ui/Panel.jsx';
import { Badge, ConfidenceBadge } from '../components/ui/Badge.jsx';

// VASP Intelligence page — displays known VASP intelligence database
// Initially populated with demo/research data. In production, this would
// be populated from LEA-verified intelligence.
const DEMO_VASP_DATA = [
  {
    _id: '1',
    vaspName: 'DemoExchange Platform',
    blockchain: 'TRON',
    confidence: 'MEDIUM',
    source: 'DEMO_INTEL',
    addresses: [{ address: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF', addressType: 'DEPOSIT', verified: false }],
    isDemo: true,
    notes: 'Analytical attribution based on behavioral patterns. Not confirmed.',
  },
  {
    _id: '2',
    vaspName: '[Architecture-Ready: Real VASP Intel]',
    blockchain: 'TRON',
    confidence: 'HIGH',
    source: 'ARCHITECTURE_READY',
    addresses: [],
    isDemo: false,
    notes: 'This slot is reserved for verified VASP intelligence data from LEA coordination or public research.',
  },
];

export default function VaspPage() {
  const [vasps] = useState(DEMO_VASP_DATA);
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="VASP Intelligence"
        subtitle="Virtual Asset Service Provider attribution database"
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#d2992210] border border-[#d2992230] rounded px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-[var(--accent-orange)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--accent-orange)]">
            <strong>Important:</strong> This database contains a controlled demonstration dataset.
            It does not represent complete global VASP intelligence.
            VASP attribution is analytical and must be verified through official LEA coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Panel title={`VASP Records (${vasps.length})`} noPad>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {['VASP Name', 'Blockchain', 'Addresses', 'Confidence', 'Source', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vasps.map(v => (
                    <tr
                      key={v._id}
                      onClick={() => setSelected(v)}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{v.vaspName}</td>
                      <td className="px-4 py-3"><Badge variant="blue">{v.blockchain}</Badge></td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{v.addresses?.length || 0}</td>
                      <td className="px-4 py-3"><ConfidenceBadge level={v.confidence} /></td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{v.source}</td>
                      <td className="px-4 py-3">
                        {v.isDemo && <Badge variant="demo" size="xs">DEMO</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
          <div>
            {selected ? (
              <Panel title="VASP Details">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] mb-0.5">VASP Name</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.vaspName}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="blue">{selected.blockchain}</Badge>
                    <ConfidenceBadge level={selected.confidence} />
                    {selected.isDemo && <Badge variant="demo">DEMO</Badge>}
                  </div>
                  {selected.addresses?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-2 uppercase tracking-wide">Known Addresses</p>
                      {selected.addresses.map((a, i) => (
                        <div key={i} className="bg-[var(--bg-elevated)] rounded p-2 mb-1.5">
                          <p className="font-mono text-[10px] text-[var(--accent-blue)] break-all">{a.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default" size="xs">{a.addressType}</Badge>
                            {!a.verified && <Badge variant="orange" size="xs">Unverified</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selected.notes && (
                    <div className="bg-[#d2992210] border border-[#d2992230] rounded p-2.5">
                      <p className="text-[10px] text-[var(--accent-orange)]">{selected.notes}</p>
                    </div>
                  )}
                </div>
              </Panel>
            ) : (
              <Panel>
                <EmptyState icon={Database} title="Select a VASP" description="Click a row to view VASP intelligence details." />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
