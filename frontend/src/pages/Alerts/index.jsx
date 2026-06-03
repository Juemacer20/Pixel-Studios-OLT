import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconSearch, IconRefresh, IconAlertTriangle, IconAlertOctagon,
  IconInfoCircle, IconCheck, IconX, IconPlayerPlay, IconPlayerStop,
  IconFilter, IconBell,
} from '@tabler/icons-react';
import { alertAPI } from '../../services/api';

// ── Filter options ────────────────────────────────────────────────────────────
const OLTS_LIST = ['OLT-NORTE', 'OLT-SUR', 'OLT-CENTRO', 'OLT-ESTE'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'WARNING', 'INFO'];

// ── Small helpers ─────────────────────────────────────────────────────────────
function SevBadge({ sev }) {
  const cls = { CRITICAL: 'badge-red', HIGH: 'badge-red', WARNING: 'badge-orange', INFO: 'badge-blue' };
  return <span className={`badge ${cls[sev] || 'badge-gray'}`}>{sev}</span>;
}

function StateBadge({ resolved, acknowledged }) {
  if (resolved)     return <span className="badge badge-green">Resuelto</span>;
  if (acknowledged) return <span className="badge badge-orange">Reconocido</span>;
  return <span className="badge badge-red">Activo</span>;
}

function SevIcon({ sev }) {
  if (sev === 'CRITICAL' || sev === 'HIGH') return <IconAlertOctagon size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />;
  if (sev === 'WARNING') return <IconAlertTriangle size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />;
  return <IconInfoCircle size={13} style={{ color: 'var(--cyan)', flexShrink: 0 }} />;
}

function fmt(iso) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [search, setSearch]     = useState('');
  const [severity, setSeverity] = useState('');
  const [olt, setOlt]           = useState('');
  const [tab, setTab]           = useState('active'); // active | acknowledged | resolved
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [alerts, setAlerts]     = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => setLastRefresh(new Date()), 15000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const handleAcknowledge = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };
  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a));
  };

  // Stats
  const active       = alerts.filter(a => !a.resolved).length;
  const critical     = alerts.filter(a => !a.resolved && (a.severity === 'CRITICAL' || a.severity === 'HIGH')).length;
  const warnings     = alerts.filter(a => !a.resolved && a.severity === 'WARNING').length;
  const _startOfToday = new Date(); _startOfToday.setHours(0, 0, 0, 0);
  const resolvedToday = alerts.filter(a => a.resolved && a.resolved_at && new Date(a.resolved_at) >= _startOfToday).length;

  // Filter by tab
  const byTab = alerts.filter(a => {
    if (tab === 'active')       return !a.resolved && !a.acknowledged;
    if (tab === 'acknowledged') return !a.resolved && a.acknowledged;
    if (tab === 'resolved')     return a.resolved;
    return true;
  });

  const filtered = byTab.filter(a => {
    if (severity && a.severity !== severity) return false;
    if (olt && a.olt !== olt)               return false;
    if (search) {
      const q = search.toLowerCase();
      return a.type.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.ont.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconBell size={18} style={{ color: 'var(--orange)' }} />
            Alertas
          </h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Actualizado: {lastRefresh.toLocaleTimeString('es-AR')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => setLastRefresh(new Date())}>
            <IconRefresh size={13} /> Actualizar
          </button>
          <button
            className={autoRefresh ? 'btn btn-primary' : 'btn'}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? <IconPlayerStop size={13} /> : <IconPlayerPlay size={13} />}
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Activas',        value: active,       color: 'var(--text-primary)' },
          { label: 'Críticas',       value: critical,     color: 'var(--red)' },
          { label: 'Warnings',       value: warnings,     color: 'var(--orange)' },
          { label: 'Resueltas hoy',  value: resolvedToday,color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'active',       label: `Activas (${alerts.filter(a => !a.resolved && !a.acknowledged).length})` },
          { key: 'acknowledged', label: `Reconocidas (${alerts.filter(a => !a.resolved && a.acknowledged).length})` },
          { key: 'resolved',     label: `Resueltas (${alerts.filter(a => a.resolved).length})` },
        ].map(t => (
          <button key={t.key} className={`tab-item ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            style={{ paddingLeft: 28 }}
            placeholder="Buscar tipo, mensaje, ONT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select-base" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">Severidad</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="select-base" value={olt} onChange={e => setOlt(e.target.value)}>
          <option value="">Todas las OLTs</option>
          {OLTS_LIST.map(o => <option key={o}>{o}</option>)}
        </select>
        {(search || severity || olt) && (
          <button className="btn" onClick={() => { setSearch(''); setSeverity(''); setOlt(''); }}>
            <IconX size={12} /> Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} alertas
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>OLT</th>
                <th>ONT</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Sin alertas en esta vista
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} style={{ opacity: a.resolved ? 0.65 : 1 }}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {fmt(a.timestamp)}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{a.type}</td>
                  <td><SevBadge sev={a.severity} /></td>
                  <td style={{ fontSize: 12, color: 'var(--cyan)' }}>{a.olt}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.ont}</td>
                  <td style={{ fontSize: 12, maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SevIcon sev={a.severity} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</span>
                    </div>
                  </td>
                  <td><StateBadge resolved={a.resolved} acknowledged={a.acknowledged} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!a.acknowledged && !a.resolved && (
                        <button
                          className="btn-icon"
                          title="Reconocer"
                          onClick={() => handleAcknowledge(a.id)}
                          style={{ color: 'var(--orange)' }}
                        >
                          <IconCheck size={13} />
                        </button>
                      )}
                      {!a.resolved && (
                        <button
                          className="btn-icon"
                          title="Resolver"
                          onClick={() => handleResolve(a.id)}
                          style={{ color: 'var(--green)' }}
                        >
                          <IconX size={13} />
                        </button>
                      )}
                      {a.resolved && a.resolved_at && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {fmt(a.resolved_at)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
