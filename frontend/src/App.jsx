import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { SaveConfigProvider } from './context/SaveConfigContext';

function RedirectOltView() {
  const { id } = useParams();
  return <Navigate to={`/onu/view/${id}`} replace />;
}
function RedirectOltConfig() {
  const { id } = useParams();
  return <Navigate to={`/olt/edit/${id}`} replace />;
}
import TopNav from './components/layout/TopNav';
import UpdateBanner from './components/layout/UpdateBanner';
import Breadcrumbs from './components/layout/Breadcrumbs';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';

const Dashboard        = React.lazy(() => import('./pages/Dashboard'));
const OLTs             = React.lazy(() => import('./pages/OLTs'));
const OLTConfig        = React.lazy(() => import('./pages/OLTConfig'));
const OLTNew           = React.lazy(() => import('./pages/OLTNew'));
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
const ReportsImport    = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsImport })));
const Settings         = React.lazy(() => import('./pages/Settings'));
const Users            = React.lazy(() => import('./pages/Users'));
const Zones            = React.lazy(() => import('./pages/Zones'));
const ODBs             = React.lazy(() => import('./pages/ODBs'));
const OnuTypes         = React.lazy(() => import('./pages/OnuTypes'));
const AuthPresets      = React.lazy(() => import('./pages/AuthPresets'));
const Graphs           = React.lazy(() => import('./pages/Graphs'));
const Unconfigured     = React.lazy(() => import('./pages/Unconfigured'));
const Diagnostics      = React.lazy(() => import('./pages/Diagnostics'));
const AuthorizeONU     = React.lazy(() => import('./pages/AuthorizeONU'));
const ConfigComparison = React.lazy(() => import('./pages/ConfigComparison'));
const VSOLDashboard     = React.lazy(() => import('./pages/VSOL'));
const VSOLOnuList       = React.lazy(() => import('./pages/VSOL/OnuList'));
const VSOLOnuView       = React.lazy(() => import('./pages/VSOL/OnuView'));
const VSOLProfiles      = React.lazy(() => import('./pages/VSOL/Profiles'));
const VSOLAutofind      = React.lazy(() => import('./pages/VSOL/Autofind'));
const VSOLBatch         = React.lazy(() => import('./pages/VSOL/Batch'));
const KingTypeDashboard = React.lazy(() => import('./pages/KingType'));
const KingTypeAutofind  = React.lazy(() => import('./pages/KingType/Autofind'));
const KingTypeProfiles  = React.lazy(() => import('./pages/KingType/Profiles'));
const KingTypeOnuList   = React.lazy(() => import('./pages/KingType/OnuList'));
const KingTypeBatch     = React.lazy(() => import('./pages/KingType/Batch'));

const Fallback = () => (
  <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
    <div className="spinner" />
  </div>
);

function AppLayout() {
  useWebSocket();

  return (
    <SaveConfigProvider>
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <TopNav />
      <UpdateBanner />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-4">
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <Breadcrumbs />
          <React.Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/"                          element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"                 element={<Dashboard />} />

              {/* OLTs — SmartOLT paths */}
              <Route path="/olt"                       element={<OLTs />} />
              <Route path="/olt/add"                   element={<OLTNew />} />
              <Route path="/olt/edit/:id"              element={<OLTConfig />} />

              {/* ONTs / ONUs — SmartOLT paths */}
              <Route path="/onu/configured"            element={<ONTs />} />
              <Route path="/onu/view/:id"              element={<ONUView />} />
              <Route path="/onu/unconfigured"          element={<Unconfigured />} />
              <Route path="/onu/authorize"             element={<AuthorizeONU />} />

              {/* Redirects rutas viejas → nuevas */}
              <Route path="/onts/view/:id"             element={<RedirectOltView />} />
              <Route path="/onts/*"                    element={<Navigate to="/onu/configured" replace />} />
              <Route path="/olts"                      element={<Navigate to="/olt" replace />} />
              <Route path="/olts/new"                  element={<Navigate to="/olt/add" replace />} />
              <Route path="/olts/:id/config"           element={<RedirectOltConfig />} />
              <Route path="/onu-types"                 element={<Navigate to="/onu_types/listing" replace />} />
              <Route path="/zones"                     element={<Navigate to="/locations/listing" replace />} />
              <Route path="/odbs"                      element={<Navigate to="/odbs/listing" replace />} />
              <Route path="/auth-presets"              element={<Navigate to="/onu_authorization_presets/listing" replace />} />
              <Route path="/config-comparison"         element={<Navigate to="/config_comparison" replace />} />
              <Route path="/speed-profiles"            element={<Navigate to="/speed_profiles" replace />} />
              <Route path="/tr069"                     element={<Navigate to="/system_config" replace />} />
              <Route path="/reports/authorizations"    element={<Navigate to="/reports/authorizations/list" replace />} />

              {/* SmartOLT canonical paths */}
              <Route path="/onu_types/listing"                 element={<OnuTypes />} />
              <Route path="/locations/listing"                 element={<Zones />} />
              <Route path="/odbs/listing"                      element={<ODBs />} />
              <Route path="/onu_authorization_presets/listing" element={<AuthPresets />} />
              <Route path="/config_comparison"                 element={<ConfigComparison />} />
              <Route path="/speed_profiles"                    element={<SpeedProfiles />} />
              <Route path="/system_config"                     element={<TR069 />} />

              {/* Reports */}
              <Route path="/reports"                       element={<Navigate to="/reports/tasks" replace />} />
              <Route path="/reports/tasks"                 element={<ReportsTasks />} />
              <Route path="/reports/authorizations/list"   element={<ReportsAuths />} />
              <Route path="/reports/export"                element={<ReportsExport />} />
              <Route path="/reports/import"                element={<ReportsImport />} />

              {/* Otros */}
              <Route path="/graphs"          element={<Graphs />} />
              <Route path="/diagnostics"     element={<Diagnostics />} />
              <Route path="/clients/*"       element={<Clients />} />
              <Route path="/map"             element={<MapView />} />
              <Route path="/alerts"          element={<Alerts />} />
              <Route path="/events"          element={<Events />} />
              <Route path="/settings"        element={<Settings />} />
              <Route path="/users"           element={<Users />} />

              {/* VSOL */}
              <Route path="/olts/:id/vsol"                        element={<VSOLDashboard />} />
              <Route path="/olts/:id/vsol/pon/:ponIndex"          element={<VSOLOnuList />} />
              <Route path="/olts/:id/vsol/onu/:ponIndex/:onuId"   element={<VSOLOnuView />} />
              <Route path="/olts/:id/vsol/profiles"               element={<VSOLProfiles />} />
              <Route path="/olts/:id/vsol/autofind"               element={<VSOLAutofind />} />
              <Route path="/olts/:id/vsol/batch"                  element={<VSOLBatch />} />

              {/* KingType */}
              <Route path="/olts/:id/kingtype"                    element={<KingTypeDashboard />} />
              <Route path="/olts/:id/kingtype/pon/:ponIndex"      element={<KingTypeOnuList />} />
              <Route path="/olts/:id/kingtype/profiles"           element={<KingTypeProfiles />} />
              <Route path="/olts/:id/kingtype/autofind"           element={<KingTypeAutofind />} />
              <Route path="/olts/:id/kingtype/batch"              element={<KingTypeBatch />} />
            </Routes>
          </React.Suspense>
          </div>
          <footer style={{ textAlign: 'center', padding: '14px', fontSize: 12, color: 'var(--text-muted)' }}>
            Pixel Studios OLT · v3.3.0 · © 2026 · <span style={{ color: '#7fb2e6' }}>💡 What's new</span>
          </footer>
        </main>
      </div>
    </div>
    </SaveConfigProvider>
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
