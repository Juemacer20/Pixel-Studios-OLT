import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';

const Dashboard        = React.lazy(() => import('./pages/Dashboard'));
const OLTs             = React.lazy(() => import('./pages/OLTs'));
const OLTConfig        = React.lazy(() => import('./pages/OLTConfig'));
const ONTs             = React.lazy(() => import('./pages/ONTs'));
const ONUView          = React.lazy(() => import('./pages/ONUView'));
const Clients          = React.lazy(() => import('./pages/Clients'));
const MapView          = React.lazy(() => import('./pages/MapView'));
const TR069            = React.lazy(() => import('./pages/TR069'));
const Alerts           = React.lazy(() => import('./pages/Alerts'));
const Events           = React.lazy(() => import('./pages/Events'));
const SpeedProfiles    = React.lazy(() => import('./pages/SpeedProfiles'));
const ReportsTasks     = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsTasks })));
const ReportsAuths     = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsAuthorizations })));
const ReportsExport    = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsExport })));
const Settings         = React.lazy(() => import('./pages/Settings'));
const Users            = React.lazy(() => import('./pages/Users'));
const Zones            = React.lazy(() => import('./pages/Zones'));
const ODBs             = React.lazy(() => import('./pages/ODBs'));
const OnuTypes         = React.lazy(() => import('./pages/OnuTypes'));
const AuthPresets      = React.lazy(() => import('./pages/AuthPresets'));
const Graphs           = React.lazy(() => import('./pages/Graphs'));
const Unconfigured     = React.lazy(() => import('./pages/Unconfigured'));
const Diagnostics      = React.lazy(() => import('./pages/Diagnostics'));

const Fallback = () => (
  <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
    <div className="spinner" />
  </div>
);

function AppLayout() {
  useWebSocket();

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <TopNav />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-4">
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <React.Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/"                element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"       element={<Dashboard />} />
              <Route path="/olts"             element={<OLTs />} />
              <Route path="/olts/:id/config" element={<OLTConfig />} />
              <Route path="/onts/view/:id"   element={<ONUView />} />
              <Route path="/onts/*"          element={<ONTs />} />
              <Route path="/clients/*"       element={<Clients />} />
              <Route path="/map"             element={<MapView />} />
              <Route path="/tr069"           element={<TR069 />} />
              <Route path="/alerts"          element={<Alerts />} />
              <Route path="/events"          element={<Events />} />
              <Route path="/speed-profiles"  element={<SpeedProfiles />} />
              <Route path="/reports"             element={<Navigate to="/reports/tasks" replace />} />
              <Route path="/reports/tasks"       element={<ReportsTasks />} />
              <Route path="/reports/authorizations" element={<ReportsAuths />} />
              <Route path="/reports/export"      element={<ReportsExport />} />
              <Route path="/settings"        element={<Settings />} />
              <Route path="/users"           element={<Users />} />
              <Route path="/zones"           element={<Zones />} />
              <Route path="/odbs"            element={<ODBs />} />
              <Route path="/onu-types"       element={<OnuTypes />} />
              <Route path="/auth-presets"    element={<AuthPresets />} />
              <Route path="/graphs"          element={<Graphs />} />
              <Route path="/onu/unconfigured" element={<Unconfigured />} />
              <Route path="/diagnostics"     element={<Diagnostics />} />
            </Routes>
          </React.Suspense>
          </div>
          <footer style={{ textAlign: 'center', padding: '14px', fontSize: 12, color: 'var(--text-muted)' }}>
            Pixel Studios OLT · v3.3.0 · © 2026 · <span style={{ color: '#7fb2e6' }}>💡 What's new</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const token = useAuthStore(s => s.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/*"     element={token ? <AppLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
