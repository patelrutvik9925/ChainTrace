import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CasesPage from './pages/CasesPage.jsx';
import CaseDetailPage from './pages/CaseDetailPage.jsx';
import GraphPage from './pages/GraphPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import MonitoringPage from './pages/MonitoringPage.jsx';
import VaspPage from './pages/VaspPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import WalletIntakePage from './pages/WalletIntakePage.jsx';
import WalletProfilePage from './pages/WalletProfilePage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import IntegrationPage from './pages/IntegrationPage.jsx';
import { useAuthStore } from './features/auth/authStore.js';

/** Redirects to /login when not authenticated, otherwise renders children */
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            fontSize: '12px',
          },
        }}
      />
      <Routes>
        {/* / and /login always show the Login page — user must explicitly press Login to proceed */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected application routes — all wrapped in AppLayout auth guard */}
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="dashboard"             element={<DashboardPage />} />
          <Route path="cases"                 element={<CasesPage />} />
          <Route path="cases/:id"             element={<CaseDetailPage />} />
          <Route path="graph"                 element={<GraphPage />} />
          <Route path="alerts"                element={<AlertsPage />} />
          <Route path="monitoring"            element={<MonitoringPage />} />
          <Route path="vasp"                  element={<VaspPage />} />
          <Route path="reports"               element={<ReportsPage />} />
          <Route path="audit"                 element={<AuditPage />} />
          <Route path="search"                element={<SearchPage />} />
          <Route path="wallets/intake"        element={<WalletIntakePage />} />
          <Route path="wallets/:address"      element={<WalletProfilePage />} />
          <Route path="transactions"          element={<TransactionsPage />} />
          <Route path="transactions/:hash"    element={<TransactionsPage />} />
          <Route path="integration"           element={<IntegrationPage />} />
        </Route>

        {/* Catch-all — unauthenticated → login, authenticated → dashboard */}
        <Route path="*" element={
          <RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}
