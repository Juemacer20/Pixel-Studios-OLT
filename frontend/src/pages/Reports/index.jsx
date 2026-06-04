import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { IconDownload, IconRefresh, IconCalendar } from '@tabler/icons-react';

const TABS = ['Disponibilidad', 'Señal', 'Eventos', 'Clientes'];

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
