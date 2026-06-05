// ─────────────────────────────────────────────────────────────────────────────
// Reports sub-pages: Tasks, Authorizations, Export
// All three are exported as named exports and loaded lazily in App.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  IconDownload, IconRefresh, IconCalendar, IconX, IconSearch,
  IconClipboardList, IconShieldCheck, IconChevronLeft, IconChevronRight,
  IconFileExport, IconHistory,
} from '@tabler/icons-react';
import { reportsAPI, oltAPI } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function downloadCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]).join(',');
  const body    = rows.map(r =>
    Object.values(r).map(v =>
      v == null ? '' : String(v).includes(',') ? `"${v}"` : v
    ).join(',')
  ).join('\n');
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function useOLTs() {
  const [olts, setOlts] = useState([]);
  useEffect(() => {
    oltAPI.list().then(r => setOlts(r.data?.data || r.data || [])).catch(() => {});
  }, []);
  return olts;
}

function TaskStatusBadge({ details }) {
  const s = String(details?.status || 'SUCCESS').toUpperCase();
  if (s === 'FAILED' || s === 'ERROR') return <span className="badge badge-red">Failed</span>;
  if (s === 'RUNNING' || s === 'PENDING') return <span className="badge badge-orange">Running</span>;
  return <span className="badge badge-green">Successful</span>;
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page {page} of {pages}</span>
      <button className="btn-icon" disabled={page <= 1}  onClick={() => onPage(page - 1)}><IconChevronLeft  size={14} /></button>
      <button className="btn-icon" disabled={page >= pages} onClick={() => onPage(page + 1)}><IconChevronRight size={14} /></button>
    </div>
  );
}

// ── TASKS PAGE ────────────────────────────────────────────────────────────────
const TASK_ACTIONS = ['Any', 'CREATE_ONT', 'AUTHORIZE_ONT', 'ZTP_AUTHORIZE', 'UPDATE_ONT', 'DELETE_ONT', 'REBOOT_ONT', 'UPDATE_OLT'];

export function ReportsTasks() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [user,    setUser]    = useState('');
  const [action,  setAction]  = useState('Any');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (user)             params.user   = user;
      if (action !== 'Any') params.action = action;
      if (from)             params.from   = from;
      if (to)               params.to     = to;
      const { data } = await reportsAPI.tasks(params);
      setItems(data.data?.items  || []);
      setTotal(data.data?.total  || 0);
      setPage(data.data?.page    || 1);
      setPages(data.data?.pages  || 1);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [user, action, from, to]);

  useEffect(() => { fetch(1); }, [fetch]);

  const hasFilters = user || action !== 'Any' || from || to;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &rsaquo; Tasks</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Audit log of operations performed on ONTs / OLTs</span>
        </div>
        <button className="btn" onClick={() => fetch(page)} disabled={loading}>
          <IconRefresh size={13} style={{ animation: loading ? 'spin-slow 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Filter by user…" value={user} onChange={e => setUser(e.target.value)} />
        </div>
        <select className="select-base" value={action} onChange={e => setAction(e.target.value)} style={{ minWidth: 160 }}>
          {TASK_ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
        <input className="input-base" type="date" style={{ width: 140 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input className="input-base" type="date" style={{ width: 140 }} value={to} onChange={e => setTo(e.target.value)} />
        {hasFilters && (
          <button className="btn" onClick={() => { setUser(''); setAction('Any'); setFrom(''); setTo(''); }}>
            <IconX size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{total} records</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Action</th>
                <th>Target / ONT</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 0', gap: 12, color: 'var(--text-muted)' }}>
                    <IconClipboardList size={40} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 13 }}>No tasks recorded yet.</span>
                  </div>
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{item.action}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.target || '—'}</td>
                  <td style={{ fontSize: 12 }}>{item.user_id || '—'}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.ip_address || '—'}</td>
                  <td><TaskStatusBadge details={item.details} /></td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt(item.created_at)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220 }}>
                    {item.details
                      ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof item.details === 'object' ? JSON.stringify(item.details) : String(item.details)}</span>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} onPage={fetch} />
      </div>
    </div>
  );
}

// ── AUTHORIZATIONS PAGE ───────────────────────────────────────────────────────
export function ReportsAuthorizations() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (search) params.search = search;
      if (from)   params.from   = from;
      if (to)     params.to     = to;
      const { data } = await reportsAPI.authorizations(params);
      setItems(data.data?.items  || []);
      setTotal(data.data?.total  || 0);
      setPage(data.data?.page    || 1);
      setPages(data.data?.pages  || 1);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, from, to]);

  useEffect(() => { fetch(1); }, [fetch]);

  const exportAuthCSV = () => {
    downloadCSV(items.map((it, i) => ({
      '#': i + 1 + (page - 1) * 50,
      User:      it.user_id    || '',
      'SN/MAC':  it.target     || '',
      Action:    it.action     || '',
      IP:        it.ip_address || '',
      Date:      fmt(it.created_at),
    })), 'authorizations.csv');
  };

  const hasFilters = search || from || to;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &rsaquo; Authorizations</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>History of ONT authorizations</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => fetch(page)} disabled={loading}>
            <IconRefresh size={13} style={{ animation: loading ? 'spin-slow 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={exportAuthCSV} disabled={items.length === 0}>
            <IconDownload size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search user, SN/MAC, action…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input className="input-base" type="date" style={{ width: 140 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input className="input-base" type="date" style={{ width: 140 }} value={to} onChange={e => setTo(e.target.value)} />
        {hasFilters && (
          <button className="btn" onClick={() => { setSearch(''); setFrom(''); setTo(''); }}>
            <IconX size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{total} records</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>User</th>
                <th>SN / MAC</th>
                <th>Action</th>
                <th>IP</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 0', gap: 12, color: 'var(--text-muted)' }}>
                    <IconShieldCheck size={40} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 13 }}>No authorizations recorded yet.</span>
                  </div>
                </td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(page - 1) * 50 + idx + 1}</td>
                  <td style={{ fontSize: 12 }}>{item.user_id || '—'}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{item.target || '—'}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{item.action}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.ip_address || '—'}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} onPage={fetch} />
      </div>
    </div>
  );
}

// ── EXPORT PAGE ───────────────────────────────────────────────────────────────
const ONT_STATUSES = ['Any', 'ONLINE', 'OFFLINE', 'LOS', 'DYING_GASP', 'PENDING', 'DEACTIVATED'];

const RECENT_EXPORTS_KEY = 'pso_recent_exports';

function getRecentExports() {
  try { return JSON.parse(localStorage.getItem(RECENT_EXPORTS_KEY) || '[]'); } catch { return []; }
}
function saveRecentExport(entry) {
  const list = [entry, ...getRecentExports()].slice(0, 5);
  localStorage.setItem(RECENT_EXPORTS_KEY, JSON.stringify(list));
}

export function ReportsExport() {
  const olts         = useOLTs();
  const [oltId,  setOltId]  = useState('');
  const [status, setStatus] = useState('Any');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentExports, setRecentExports] = useState(getRecentExports);

  const doExport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (oltId)            params.olt_id = oltId;
      if (status !== 'Any') params.status = status;
      if (search)           params.search = search;
      const { data } = await reportsAPI.exportData(params);
      const onts = data.data || [];

      const rows = onts.map(o => ({
        Serial:      o.serial_number || '',
        MAC:         o.mac           || '',
        Description: o.description   || '',
        OLT:         o.olt?.name     || '',
        Status:      o.status        || '',
        'Rx Power':  o.rx_power      != null ? o.rx_power  : '',
        'Tx Power':  o.tx_power      != null ? o.tx_power  : '',
        'OLT Rx':    o.olt_rx_power  != null ? o.olt_rx_power : '',
        'Distance':  o.distance      != null ? o.distance  : '',
        'Temperature': o.temperature != null ? o.temperature : '',
        'Last Seen': o.last_seen     ? fmt(o.last_seen) : '',
      }));

      const filename = `onts-export-${new Date().toISOString().slice(0,10)}.csv`;
      downloadCSV(rows, filename);

      const entry = {
        id:       Date.now(),
        date:     new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
        filters:  [oltId && `OLT:${olts.find(o => o.id === oltId)?.name || oltId}`, status !== 'Any' && `Status:${status}`, search && `Search:${search}`].filter(Boolean).join(', ') || 'All ONTs',
        count:    rows.length,
        filename,
        rows,
      };
      saveRecentExport(entry);
      setRecentExports(getRecentExports());
    } catch (e) {
      console.error('export error', e);
    } finally {
      setLoading(false);
    }
  };

  const redownload = (entry) => {
    if (entry.rows?.length) downloadCSV(entry.rows, entry.filename || 'onts-export.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &rsaquo; Export</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Export ONTs to CSV with optional filters</span>
        </div>
      </div>

      {/* Export panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <IconFileExport size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--cyan)' }} />
          Export ONUs to CSV
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select-base" value={oltId} onChange={e => setOltId(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Any OLT</option>
            {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select className="select-base" value={status} onChange={e => setStatus(e.target.value)} style={{ minWidth: 130 }}>
            {ONT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search serial, MAC, description…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {(oltId || status !== 'Any' || search) && (
            <button className="btn" onClick={() => { setOltId(''); setStatus('Any'); setSearch(''); }}>
              <IconX size={12} /> Clear
            </button>
          )}
        </div>

        {/* Export button */}
        <div>
          <button
            onClick={doExport}
            disabled={loading}
            style={{
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, #23a85a, #1c904c)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '9px 22px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              transition: 'opacity 0.15s',
            }}
          >
            <IconDownload size={15} />
            {loading ? 'Exporting…' : 'Export ONUs'}
          </button>
          <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            Columns: Serial, MAC, Description, OLT, Status, Rx Power, Tx Power, OLT Rx, Distance, Temperature, Last Seen
          </span>
        </div>
      </div>

      {/* Recent exports */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconHistory size={14} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Recent Exports</span>
        </div>
        {recentExports.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', gap: 10, color: 'var(--text-muted)' }}>
            <IconFileExport size={32} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: 12 }}>No exports yet. Use the button above to export your ONTs.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Filters</th>
                  <th>Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentExports.map(entry => (
                  <tr key={entry.id}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{entry.date}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.filters || 'All ONTs'}</td>
                    <td style={{ fontSize: 12 }}>{entry.count} ONTs</td>
                    <td>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => redownload(entry)}
                        disabled={!entry.rows?.length}
                        title="Download again"
                      >
                        <IconDownload size={12} /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Reports page (charts) — kept as default export, no longer routed
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Disponibilidad', 'Señal', 'Eventos', 'Clients'];

function DateRange({ from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <IconCalendar size={14} style={{ color: 'var(--text-muted)' }} />
      <input type="date" className="input-base" style={{ width: 140 }} value={from} onChange={e => onFromChange(e.target.value)} />
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
      <input type="date" className="input-base" style={{ width: 140 }} value={to}   onChange={e => onToChange(e.target.value)} />
    </div>
  );
}

function buildAvailability() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    return {
      date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      disponibilidad: parseFloat((97 + Math.random() * 2.5).toFixed(2)),
      downtime: parseFloat((Math.random() * 45).toFixed(1)),
    };
  });
}

function buildSignalReport() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    return {
      date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      avg_rx: parseFloat((-20 + Math.random() * 3 - 1).toFixed(2)),
      critical_count: Math.floor(Math.random() * 8),
    };
  });
}

function buildEventsReport() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    return {
      date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      critical: Math.floor(Math.random() * 5),
      warning:  Math.floor(Math.random() * 12),
      info:     Math.floor(Math.random() * 20),
    };
  });
}

function buildClientsReport() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    return {
      date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      activos: 280 + Math.floor(Math.random() * 20),
      nuevos:  Math.floor(Math.random() * 5),
    };
  });
}

function exportCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const tooltipStyle = { background: 'var(--sidebar-bg)', border: '1px solid var(--border)', fontSize: 11 };

function AvailabilityTab() {
  const data = buildAvailability();
  const avgAvail = (data.reduce((a, d) => a + d.disponibilidad, 0) / data.length).toFixed(2);
  const totalDowntime = data.reduce((a, d) => a + d.downtime, 0).toFixed(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="stats-bar">
        <div className="stat-item"><div className="stat-label">Disponibilidad promedio</div><div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>{avgAvail}%</div></div>
        <div className="stat-item"><div className="stat-label">Downtime total</div><div className="stat-value" style={{ color: 'var(--orange)', fontSize: 18 }}>{totalDowntime} min</div></div>
        <div className="stat-item"><div className="stat-label">SLA Target</div><div className="stat-value" style={{ color: 'var(--cyan)', fontSize: 18 }}>99.5%</div></div>
        <div className="stat-item"><div className="stat-label">SLA Cumplido</div>
          <div className="stat-value" style={{ color: Number(avgAvail) >= 99.5 ? 'var(--green)' : 'var(--red)', fontSize: 18 }}>
            {Number(avgAvail) >= 99.5 ? 'Sí' : 'No'}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Disponibilidad diaria (%)</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={4} />
            <YAxis domain={[95, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="disponibilidad" stroke="var(--green)" strokeWidth={2} dot={false} name="Disponibilidad %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Detalle por día</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead><tr><th>Date</th><th>Disponibilidad</th><th>Downtime (min)</th><th>SLA status</th></tr></thead>
            <tbody>
              {data.slice(-10).reverse().map((row, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 11 }}>{row.date}</td>
                  <td style={{ color: row.disponibilidad >= 99.5 ? 'var(--green)' : 'var(--orange)' }}>{row.disponibilidad}%</td>
                  <td className="mono" style={{ fontSize: 11 }}>{row.downtime}</td>
                  <td><span className={`badge ${row.disponibilidad >= 99.5 ? 'badge-green' : 'badge-orange'}`}>{row.disponibilidad >= 99.5 ? 'OK' : 'Degradado'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SignalTab() {
  const data = buildSignalReport();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>RX promedio diario (dBm)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={4} />
            <YAxis domain={[-24, -17]} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'monospace' }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="avg_rx" stroke="var(--cyan)" strokeWidth={2} dot={false} name="RX promedio" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>ONTs en estado crítico por día</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="critical_count" fill="var(--red)" radius={[3,3,0,0]} name="ONTs críticas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EventsTab() {
  const data = buildEventsReport();
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Events by severity (daily)</div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="critical" stackId="a" fill="var(--red)"    name="Crítico" />
          <Bar dataKey="warning"  stackId="a" fill="var(--orange)" name="Warning" />
          <Bar dataKey="info"     stackId="a" fill="var(--accent)" name="Info" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClientsTab() {
  const data = buildClientsReport();
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Active and new clients</div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} interval={4} />
          <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line yAxisId="left"  type="monotone" dataKey="activos" stroke="var(--cyan)"  strokeWidth={2} dot={false} name="Activos" />
          <Line yAxisId="right" type="monotone" dataKey="nuevos"  stroke="var(--green)" strokeWidth={1.5} dot={false} name="Nuevos" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Reports() {
  const [tab,  setTab]  = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(month);
  const [to,   setTo]   = useState(today);

  const dataMap = { 0: buildAvailability, 1: buildSignalReport, 2: buildEventsReport, 3: buildClientsReport };
  const nameMap = { 0: 'disponibilidad.csv', 1: 'señal.csv', 2: 'eventos.csv', 3: 'clientes.csv' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <span className="page-title">Reports</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <button className="btn btn-primary" onClick={() => exportCSV(dataMap[tab](), nameMap[tab])}>
            <IconDownload size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((t, i) => (
          <button key={t} className={`tab-item ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      <div>
        {tab === 0 && <AvailabilityTab />}
        {tab === 1 && <SignalTab />}
        {tab === 2 && <EventsTab />}
        {tab === 3 && <ClientsTab />}
      </div>
    </div>
  );
}
