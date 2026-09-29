import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.jsx';
import api from '../services/api.js';

export function AppLayout() {
  const [alertCount, setAlertCount] = useState(0);

  // Poll unread alert count for sidebar badge — auth is guaranteed by RequireAuth in App.jsx
  useEffect(() => {
    api.get('/alerts?status=UNREAD&limit=1')
      .then(r => setAlertCount(r.data.data?.total || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      api.get('/alerts?status=UNREAD&limit=1')
        .then(r => setAlertCount(r.data.data?.total || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar alertCount={alertCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet context={{ alertCount, setAlertCount }} />
      </div>
    </div>
  );
}
