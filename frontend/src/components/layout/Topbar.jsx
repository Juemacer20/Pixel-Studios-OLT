import React, { useState } from 'react';
import {
  IconRefresh, IconBell, IconTerminal2, IconChevronRight,
  IconRouter,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useOLTStore } from '../../store/oltStore';
import { useLocation } from 'react-router-dom';

const BREADCRUMBS = {
  '/dashboard':      ['Dashboard'],
  '/olts':           ['OLTs'],
  '/onts':           ['ONTs'],
  '/pon-ports':      ['Puertos PON'],
  '/signal':         ['Señal'],
  '/map':            ['Mapa GPS'],
  '/clients':        ['Clientes'],
  '/ztp':            ['ZTP'],
  '/speed-profiles': ['Velocidades'],
  '/tr069':          ['TR-069'],
  '/events':         ['Eventos'],
  '/alerts':         ['Alertas'],
  '/reports':        ['Reportes'],
  '/users':          ['Usuarios'],
  '/settings':       ['Configuración'],
};

export default function Topbar() {
  const [refreshing, setRefreshing] = useState(false);
  const qc         = useQueryClient();
  const alertCount = useAlertStore(s => s.alertCount);
  const criticalCount = useAlertStore(s => s.criticalCount);
  const { olts, selectedOLT, selectOLT } = useOLTStore();
  const location   = useLocation();

  const crumbs = BREADCRUMBS[location.pathname] || [location.pathname.slice(1)];

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header
      className="flex items-center gap-3 px-4"
      style={{
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--border)',
        minHeight: '48px',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-1" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Pixel Studios</span>
        <IconChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {c}
            </span>
            {i < crumbs.length - 1 && <IconChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* OLT Selector */}
      {olts && olts.length > 0 && (
        <div className="flex items-center gap-1.5">
          <IconRouter size={13} style={{ color: 'var(--text-muted)' }} />
          <select
            className="select-base text-xs"
            style={{ padding: '3px 6px', fontSize: '12px' }}
            value={selectedOLT?.id || ''}
            onChange={e => {
              const olt = olts.find(o => String(o.id) === e.target.value);
              selectOLT(olt || null);
            }}
          >
            <option value="">Todas las OLTs</option>
            {olts.map(o => (
              <option key={o.id} value={o.id}>{o.name || o.host}</option>
            ))}
          </select>
        </div>
      )}

      {/* Polling indicator */}
      <div className="flex items-center gap-1.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        <div className="polling-dot" />
        <span>Live</span>
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        className="btn-icon"
        title="Refrescar datos"
      >
        <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>

      {/* Alerts bell */}
      <div className="relative">
        <button className="btn-icon" title="Alertas activas">
          <IconBell size={14} />
        </button>
        {alertCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-mono"
            style={{
              background: criticalCount > 0 ? 'var(--red)' : 'var(--orange)',
              color: '#fff',
            }}
          >
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </div>

      {/* Terminal */}
      <button className="btn-icon" title="Terminal CLI">
        <IconTerminal2 size={14} />
      </button>

      {/* Clock */}
      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
        {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </header>
  );
}
