import { useEffect, useState } from 'react';
import { ShieldAlert, Filter } from 'lucide-react';
import { TopBar } from '../components/TopBar.jsx';
import { Panel, EmptyState, Spinner } from '../components/ui/Panel.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import api from '../services/api.js';
import { format } from 'date-fns';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit?limit=100')
      .then(r => setLogs(r.data.data?.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const ACTION_COLOR = {
    LOGIN: 'green', LOGOUT: 'default', LOGIN_FAILED: 'red',
    CASE_CREATED: 'blue', CASE_UPDATED: 'blue', CASE_CLOSED: 'default',
    WALLET_ADDED: 'orange', INVESTIGATION_STARTED: 'purple',
    INVESTIGATION_COMPLETED: 'green', TRACING_PERFORMED: 'orange',
    ALERT_GENERATED: 'red', ALERT_ACKNOWLEDGED: 'green',
    REPORT_GENERATED: 'blue', MONITORING_STARTED: 'green',
    MONITORING_STOPPED: 'default',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Audit Trail" subtitle="Complete system activity log" />
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={20} /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No audit records" description="System activities will appear here." />
        ) : (
          <Panel title={`Activity Log (${logs.length} entries)`} noPad>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {['Timestamp', 'Action', 'User', 'Object Type', 'Object ID', 'Description', 'Result'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-2.5 text-[var(--text-muted)] whitespace-nowrap font-mono text-[10px]">{format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={ACTION_COLOR[log.action] || 'default'} size="xs">
                        {log.action?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{log.username || log.user?.username || '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{log.objectType || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-muted)] max-w-[120px] truncate">{log.objectId || '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-xs">{log.description || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={log.result === 'SUCCESS' ? 'green' : log.result === 'FAILURE' ? 'red' : 'orange'} size="xs">{log.result}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </div>
  );
}
