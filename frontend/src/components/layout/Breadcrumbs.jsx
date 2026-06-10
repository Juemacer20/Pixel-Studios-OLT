import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Etiquetas legibles por segmento de ruta (estilo SmartOLT: Home / Sección / Página).
const LABELS = {
  dashboard: 'Dashboard', onts: 'Configured ONUs', onu: 'ONU', view: 'View', authorize: 'Authorize',
  unconfigured: 'Unconfigured', olts: 'OLTs', config: 'Config', clients: 'Clients', map: 'Map',
  tr069: 'VPN & TR069', alerts: 'Alerts', events: 'Tasks', 'speed-profiles': 'Speed profiles',
  reports: 'Reports', tasks: 'Tasks', authorizations: 'Authorizations', export: 'Export', import: 'Import',
  settings: 'Settings', users: 'Users', zones: 'Zones', odbs: 'ODBs', 'onu-types': 'ONU types',
  'auth-presets': 'Authorization presets', graphs: 'Graphs', diagnostics: 'Diagnostics',
  'config-comparison': 'Config mismatches',
};

const labelFor = (seg) => LABELS[seg] || (/^[0-9a-f-]{12,}$/i.test(seg) ? null : seg);

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/dashboard') return null;
  const segs = pathname.split('/').filter(Boolean);

  const items = [];
  let acc = '';
  for (const seg of segs) {
    acc += '/' + seg;
    const label = labelFor(seg);
    if (label) items.push({ label, path: acc });
  }
  if (!items.length) return null;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5, color: 'var(--text-muted)', padding: '8px 0 0' }}>
      <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
      {items.map((it, i) => (
        <React.Fragment key={it.path}>
          <span style={{ opacity: 0.5 }}>/</span>
          {i === items.length - 1
            ? <span style={{ color: 'var(--text-secondary)' }}>{it.label}</span>
            : <Link to={it.path} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{it.label}</Link>}
        </React.Fragment>
      ))}
    </div>
  );
}
