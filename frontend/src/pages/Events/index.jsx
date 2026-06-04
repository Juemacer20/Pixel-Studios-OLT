import React, { useState, useEffect, useRef } from 'react';
import {
  IconSearch, IconRefresh, IconFilter, IconAlertTriangle,
  IconInfoCircle, IconCircleCheck, IconX, IconAlertOctagon,
  IconPlayerPlay, IconPlayerStop, IconEye,
} from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const OLTS = ['OLT-NORTE', 'OLT-SUR', 'OLT-CENTRO', 'OLT-ESTE'];
const TYPES = ['LOS', 'LOS-OF', 'DYING_GASP', 'SIGNAL_DEGRADED', 'AUTH_FAIL', 'ROGUE_ONT', 'BOARD_TEMP', 'FAN_FAIL', 'POWER_FAIL', 'LINK_DOWN'];
const SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'];
const STATUSES = ['ACTIVE', 'RESOLVED', 'ACKNOWLEDGED'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SevBadge({ sev }) {
  const map = {
    CRITICAL: 'badge badge-red',
    WARNING:  'badge badge-orange',
    INFO:     'badge badge-blue',
  };
  return <span className={map[sev] || 'badge badge-gray'}>{sev}</span>;
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE:       'badge badge-red',
    RESOLVED:     'badge badge-green',
    ACKNOWLEDGED: 'badge badge-orange',
  };
  return <span className={map[status] || 'badge badge-gray'}>{status}</span>;
}

function SevIcon({ sev, size = 14 }) {
  if (sev === 'CRITICAL') return <IconAlertOctagon size={size} style={{ color: 'var(--red)' }} />;
  if (sev === 'WARNING')  return <IconAlertTriangle size={size} style={{ color: 'var(--orange)' }} />;
  return <IconInfoCircle size={size} style={{ color: 'var(--cyan)' }} />;
}

function fmt(iso) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Events() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [olt, setOlt] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const intervalRef = useRef(null);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        setLastRefresh(new Date());
        // In real app: refetch. Here we just update timestamp.
      }, 15000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const filtered = events.filter(e => {
    if (severity && e.severity !== severity) return false;
    if (olt && e.olt !== olt) return false;
    if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.type.toLowerCase().includes(q) || e.message.toLowerCase().includes(q) || e.ont.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const total    = events.length;
  const critical = events.filter(e => e.severity === 'CRITICAL').length;
  const warning  = events.filter(e => e.severity === 'WARNING').length;
  const info     = events.filter(e => e.severity === 'INFO').length;
  const resolved = events.filter(e => e.status === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Última actualización: {lastRefresh.toLocaleTimeString('es-AR')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => setLastRefresh(new Date())} title="Actualizar">
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { label: 'Total',     value: total,    cls: '' },
          { label: 'Crítico',   value: critical, cls: 'badge-red' },
          { label: 'Warning',   value: warning,  cls: 'badge-orange' },
          { label: 'Info',      value: info,     cls: 'badge-blue' },
          { label: 'Resueltos', value: resolved, cls: 'badge-green' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            style={{ paddingLeft: 28 }}
            placeholder="Search type, message, ONU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select-base" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">Severity</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="select-base" value={olt} onChange={e => setOlt(e.target.value)}>
          <option value="">All OLTs</option>
          {OLTS.map(o => <option key={o}>{o}</option>)}
        </select>
        <input className="input-base" type="date" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input className="input-base" type="date" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {(search || severity || olt || dateFrom || dateTo) && (
          <button className="btn" onClick={() => { setSearch(''); setSeverity(''); setOlt(''); setDateFrom(''); setDateTo(''); }}>
            <IconX size={12} /> Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} de {total}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Severity</th>
                <th>OLT</th>
                <th>ONT</th>
                <th>Message</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Sin eventos para los filtros seleccionados
                  </td>
                </tr>
              ) : filtered.map(ev => (
                <tr key={ev.id}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {fmt(ev.timestamp)}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{ev.type}</td>
                  <td><SevBadge sev={ev.severity} /></td>
                  <td style={{ fontSize: 12, color: 'var(--cyan)' }}>{ev.olt}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ev.ont}</td>
                  <td style={{ fontSize: 12, maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SevIcon sev={ev.severity} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.message}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td>
                    <button
                      className="btn-icon"
                      title="Ver detalle"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <IconEye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selectedEvent && (
        <div
          className="drawer-overlay"
          onClick={() => setSelectedEvent(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="card"
            style={{ width: 460, maxWidth: '90vw', animation: 'fade-in 0.15s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Detalle de Evento #{selectedEvent.id}</span>
              <button className="btn-icon" onClick={() => setSelectedEvent(null)}><IconX size={13} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Timestamp', fmt(selectedEvent.timestamp)],
                ['Tipo', selectedEvent.type],
                ['Severidad', selectedEvent.severity],
                ['Estado', selectedEvent.status],
                ['OLT', selectedEvent.olt],
                ['ONT', selectedEvent.ont],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                  <div className="mono" style={{ fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Message</div>
              <p style={{ fontSize: 13 }}>{selectedEvent.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
