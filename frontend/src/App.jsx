import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { useWebSocket } from './hooks/useWebSocket';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';

const Dashboard        = React.lazy(() => import('./pages/Dashboard'));
const OLTs             = React.lazy(() => import('./pages/OLTs'));
const ONTs             = React.lazy(() => import('./pages/ONTs'));
const Clients          = React.lazy(() => import('./pages/Clients'));
const MapView          = React.lazy(() => import('./pages/MapView'));
const TR069            = React.lazy(() => import('./pages/TR069'));
const ZTP              = React.lazy(() => import('./pages/ZTP'));
const Alerts           = React.lazy(() => import('./pages/Alerts'));
const Events           = React.lazy(() => import('./pages/Events'));
const PonPorts         = React.lazy(() => import('./pages/PonPorts'));
const Signal           = React.lazy(() => import('./pages/Signal'));
const SpeedProfiles    = React.lazy(() => import('./pages/SpeedProfiles'));
const Reports          = React.lazy(() => import('./pages/Reports'));
const Settings         = React.lazy(() => import('./pages/Settings'));
const Users            = React.lazy(() => import('./pages/Users'));

const Fallback = () => (
  <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
    <div className="spinner" />
  </div>
);

function AppLayout() {
  useWebSocket();
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--content-bg)' }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{
          marginLeft: sidebarCollapsed ? '52px' : '220px',
          transition: 'margin-left 0.25s ease',
        }}
      >
        <Topbar />
        <main className="flex-1 overflow-auto p-4">
          <React.Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/"                element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"       element={<Dashboard />} />
              <Route path="/olts/*"          element={<OLTs />} />
              <Route path="/onts/*"          element={<ONTs />} />
              <Route path="/clients/*"       element={<Clients />} />
              <Route path="/map"             element={<MapView />} />
              <Route path="/tr069"           element={<TR069 />} />
              <Route path="/ztp"             element={<ZTP />} />
              <Route path="/alerts"          element={<Alerts />} />
              <Route path="/events"          element={<Events />} />
              <Route path="/pon-ports"       element={<PonPorts />} />
              <Route path="/signal"          element={<Signal />} />
              <Route path="/speed-profiles"  element={<SpeedProfiles />} />
              <Route path="/reports"         element={<Reports />} />
              <Route path="/settings"        element={<Settings />} />
              <Route path="/users"           element={<Users />} />
            </Routes>
          </React.Suspense>
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
