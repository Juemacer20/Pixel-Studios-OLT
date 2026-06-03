import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import {
  IconRouter,
  IconWifi,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconActivity,
  IconChevronRight,
} from '@tabler/icons-react';
import { dashboardAPI, oltAPI, ontAPI } from '../../services/api';
import KPICards       from '../../components/dashboard/KPICards';
import StatusBadge    from '../../components/shared/StatusBadge';
import SignalValue    from '../../components/shared/SignalValue';
import BrandTag       from '../../components/shared/BrandTag';
import SignalChart    from '../../components/signal/SignalChart';
import Drawer         from '../../components/shared/Drawer';
import { useAlerts }  from '../../hooks/useAlerts';
import { useAlertStore } from '../../store/alertStore';



// ─── Signal distribution buckets (dBm) ────────────────────────────────────────
const SIGNAL_BUCKETS = [
  { range: '< -27',         min: -Infinity, max: -27,   color: 'var(--red)'    },
  { range: '-27 a -25',     min: -27,       max: -25,   color: 'var(--orange)' },
  { range: '-25 a -20',     min: -25,       max: -20,   color: 'var(--cyan)'   },
  { range: '-20 a -15',     min: -20,       max: -15,   color: 'var(--green)'  },
  { range: '> -15',         min: -15,       max: Infinity, color: 'var(--purple)' },
];

function buildSignalDistribution(onts) {
  const counts = SIGNAL_BUCKETS.map((b) => ({ ...b, count: 0 }));
  onts.forEach((ont) => {
    if (ont.rx_power == null) return;
    const v = ont.rx_power;
    const bucket = counts.find((b) => v > b.min && v <= b.max);
    if (bucket) bucket.count++;
  });
  return counts;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--orange)',
  MEDIUM:   'var(--yellow)',
  LOW:      'var(--text-muted)',
  INFO:     'var(--cyan)',
};

const EVENT_TYPE_LABELS = {
  LOS:         'LOS',
  DYING_GASP:  'Dying Gasp',
  CPU_HIGH:    'CPU Alto',
  TEMP_HIGH:   'Temp. Alta',
  HIGH_SIGNAL: 'Señal Alta',
  LOW_SIGNAL:  'Señal Baja',
  ONT_OFFLINE: 'ONT Offline',
  ZTP:         'ZTP',
};

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return `${Math.round(diff)}s`;
  if (diff < 3600)   return `${Math.round(diff / 60)}m`;
  if (diff < 86400)  return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function CPUBar({ value }) {
  const pct   = Math.min(100, Math.max(0, value ?? 0));
  const color = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--orange)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span className="mono" style={{ fontSize: 10, color, width: 30, textAlign: 'right' }}>
        {value != null ? `${Math.round(value)}%` : '—'}
      </span>
    </div>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────
function OLTMiniTable({ olts, onSelect }) {
  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconRouter size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>OLTs</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {olts.filter((o) => o.status === 'online').length}/{olts.length} online
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>ONTs</th>
              <th>CPU</th>
            </tr>
          </thead>
          <tbody>
            {olts.map((olt) => (
              <tr
                key={olt.id}
                onClick={() => onSelect?.(olt)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <td><StatusBadge status={olt.status} /></td>
                <td>
                  <span className="mono" style={{ fontSize: 12 }}>{olt.name}</span>
                </td>
                <td><BrandTag brand={olt.brand} /></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {olt._count?.onts ?? 0}
                </td>
                <td style={{ width: 110 }}><CPUBar value={olt.cpu_usage} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ONTMiniTable({ onts, onSelect }) {
  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconWifi size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>ONTs recientes</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          mostrando {Math.min(onts.length, 20)}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Serial</th>
              <th>Cliente</th>
              <th>OLT</th>
              <th>RX</th>
              <th>TX</th>
            </tr>
          </thead>
          <tbody>
            {onts.slice(0, 20).map((ont) => (
              <tr
                key={ont.id}
                onClick={() => onSelect?.(ont)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <td><StatusBadge status={ont.status} /></td>
                <td>
                  <span className="mono" style={{ fontSize: 12 }}>{ont.serial_number}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ont.client?.name || '—'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ont.olt?.name}</td>
                <td><SignalValue value={ont.rx_power} /></td>
                <td><SignalValue value={ont.tx_power} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentEventsPanel({ events }) {
  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconActivity size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Eventos recientes</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {events.length}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div className="empty-state">
            <IconCheck size={22} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Sin eventos recientes</div>
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '9px 14px',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Severity dot */}
              <span
                style={{
                  marginTop: 3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: SEVERITY_COLORS[ev.severity] || 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span
                    className="badge badge-gray"
                    style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4 }}
                  >
                    {EVENT_TYPE_LABELS[ev.type] || ev.type}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: SEVERITY_COLORS[ev.severity] || 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {ev.severity}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.message}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <IconClock size={10} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {relativeTime(ev.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Signal distribution bar chart ───────────────────────────────────────────
function SignalDistributionChart({ onts }) {
  const data = buildSignalDistribution(onts);

  const CustomBarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 11,
        }}
      >
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
          {d.range} dBm
        </div>
        <div style={{ color: d.color, fontFamily: 'monospace' }}>
          {d.count} ONTs
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <IconActivity size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Distribución de señal RX
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          (por rango dBm)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        {SIGNAL_BUCKETS.map((b) => (
          <div key={b.range} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.range} dBm</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  useAlerts({ resolved: false });

  const [selectedONT, setSelectedONT] = useState(null);

  // ── OLTs ──
  const { data: oltsRaw, isError: oltsErr } = useQuery({
    queryKey: ['olts', {}],
    queryFn: () => oltAPI.list().then((r) => r.data?.data ?? r.data),
    refetchInterval: 60_000,
    retry: 1,
  });
  const olts = oltsErr || !oltsRaw ? [] : oltsRaw;

  // ── ONTs ──
  const { data: ontsRaw, isError: ontsErr } = useQuery({
    queryKey: ['onts', {}],
    queryFn: () => ontAPI.list({ limit: 50 }).then((r) => r.data?.data ?? r.data),
    refetchInterval: 30_000,
    retry: 1,
  });
  const onts = ontsErr || !ontsRaw
    ? []
    : Array.isArray(ontsRaw) ? ontsRaw : ontsRaw.data ?? [];

  // ── Recent events from alert store ──
  const activeAlerts = useAlertStore((s) => s.activeAlerts);
  const events = useMemo(() => activeAlerts.slice(0, 10), [activeAlerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* ── Row 1: KPI Cards ── */}
      <KPICards />

      {/* ── Row 2: 12-column grid — OLT (3) | ONT (5) | Events (4) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 5fr 4fr',
          gap: 14,
          minHeight: 0,
          flex: '1 1 320px',
        }}
      >
        {/* Left: OLT table */}
        <OLTMiniTable olts={olts} />

        {/* Center: ONT table */}
        <ONTMiniTable onts={onts} onSelect={setSelectedONT} />

        {/* Right: Recent events */}
        <RecentEventsPanel events={events} />
      </div>

      {/* ── Row 3: Signal distribution ── */}
      <SignalDistributionChart onts={onts} />

      {/* ── ONT Detail Drawer ── */}
      <Drawer
        open={!!selectedONT}
        onClose={() => setSelectedONT(null)}
        title={`ONT — ${selectedONT?.serial_number || ''}`}
        width={520}
      >
        {selectedONT && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
            {/* Info grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              {[
                ['Serial',   selectedONT.serial_number],
                ['Estado',   <StatusBadge key="s" status={selectedONT.status} />],
                ['OLT',      selectedONT.olt?.name || '—'],
                ['Cliente',  selectedONT.client?.name || '—'],
                ['RX Power', <SignalValue key="rx" value={selectedONT.rx_power} size="md" />],
                ['TX Power', <SignalValue key="tx" value={selectedONT.tx_power} size="md" />],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: 'var(--content-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {k}
                  </div>
                  <div className="mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Signal chart */}
            <SignalChart ontId={selectedONT.id} height={180} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
