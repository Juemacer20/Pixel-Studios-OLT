import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AlertBanner from './components/layout/AlertBanner';
import { useWebSocket } from './hooks/useWebSocket';
import { useUIStore } from './store/uiStore';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const OLTs = React.lazy(() => import('./pages/OLTs'));
const ONTs = React.lazy(() => import('./pages/ONTs'));
const Alerts = React.lazy(() => import('./pages/Alerts'));
const Clients = React.lazy(() => import('./pages/Clients'));
const MapView = React.lazy(() => import('./pages/MapView'));
const TR069 = React.lazy(() => import('./pages/TR069'));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings'));

export default function App() {
  useWebSocket();
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0E1A' }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '52px' : '220px' }}
      >
        <Topbar />
        <AlertBanner />
        <main className="flex-1 overflow-auto p-4">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Cargando...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/olts/*" element={<OLTs />} />
              <Route path="/onts/*" element={<ONTs />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/clients/*" element={<Clients />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/tr069" element={<TR069 />} />
              <Route path="/notifications" element={<NotificationSettings />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}
