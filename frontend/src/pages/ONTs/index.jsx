import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  IconSearch, IconRefresh, IconTrash, IconPower, IconGauge,
  IconFilter, IconX, IconChevronDown, IconChevronUp,
  IconWifi, IconUser, IconDownload, IconUpload, IconEye,
} from '@tabler/icons-react';
import { ontAPI, oltAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import SignalValue from '../../components/shared/SignalValue';
import BrandTag from '../../components/shared/BrandTag';
import toast from 'react-hot-toast';


/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getSignalMeta(value) {
  if (value == null) return { cls: 'signal-unknown',  label: 'Unknown', key: 'unknown',  badgeClass: 'badge-gray' };
  if (value >= -15)  return { cls: 'signal-high',     label: 'High',        key: 'high',     badgeClass: 'badge-purple' };
  if (value > -20)   return { cls: 'signal-optimal',  label: 'Optimal',      key: 'optimal',  badgeClass: 'badge-green' };
  if (value > -25)   return { cls: 'signal-normal',   label: 'Normal',      key: 'normal',   badgeClass: 'badge-blue' };
  if (value > -27)   return { cls: 'signal-warn',     label: 'Warning', key: 'warn',     badgeClass: 'badge-orange' };
  return              { cls: 'signal-critical', label: 'Critical',      key: 'critical', badgeClass: 'badge-red' };
}

function getSignalCssColor(cls) {
  const map = {
    'signal-optimal':  'var(--green)',
    'signal-normal':   'var(--cyan)',
    'signal-warn':     'var(--orange)',
    'signal-critical': 'var(--red)',
    'signal-high':     'var(--purple)',
    'signal-unknown':  'var(--text-muted)',
  };
  return map[cls] || 'var(--text-muted)';
}

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDist(m) {
  if (m == null) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m} m`;
}

const PAGE_SIZE = 25;

/* ─── Chart tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1c2128', border: '1px solid #30363d',
      borderRadius: 6, padding: '6px 10px', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 3 }}>
        {new Date(label).toLocaleString('es-AR', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
        })}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey.toUpperCase()}: {p.value?.toFixed(2)} dBm
        </div>
      ))}
    </div>
  );
}

/* ─── Mini Signal Chart (drawer tab 0) ──────────────────────────────────── */
function MiniSignalChart({ ontId, height = 160 }) {
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['signal-history', ontId, '24h'],
    queryFn: () =>
      ontAPI.signalHistory(ontId, '24h')
        .then(r => r.data?.data || r.data || [])
        .catch(() => []),
    enabled: !!ontId,
    staleTime: 60000,
  });

  const chartData = useMemo(() =>
    raw.map(h => ({
      ts: new Date(h.timestamp).getTime(),
      rx: h.rx_power != null ? parseFloat(h.rx_power.toFixed(2)) : null,
      tx: h.tx_power != null ? parseFloat(h.tx_power.toFixed(2)) : null,
    })), [raw]);

  return (
    <div style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Signal — last 24h</span>
      </div>
      {isLoading ? (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="rxGradMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#79c0ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#79c0ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txGradMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="ts" type="number" domain={['auto','auto']} scale="time"
              tickFormatter={v => new Date(v).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis domain={[-32, -2]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="rx" stroke="#79c0ff" fill="url(#rxGradMini)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="tx" stroke="#3fb950" fill="url(#txGradMini)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {[['#79c0ff', 'RX'], ['#3fb950', 'TX']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 2, background: c, borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Full Signal Chart (drawer tab 1) ──────────────────────────────────── */
function SignalTabContent({ ontId }) {
  const [range, setRange] = useState('24h');

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['signal-history', ontId, range],
    queryFn: () =>
      ontAPI.signalHistory(ontId, range)
        .then(r => r.data?.data || r.data || [])
        .catch(() => []),
    enabled: !!ontId,
    staleTime: 60000,
  });

  const chartData = useMemo(() =>
    raw.map(h => ({
      ts: new Date(h.timestamp).getTime(),
      rx: h.rx_power != null ? parseFloat(h.rx_power.toFixed(2)) : null,
      tx: h.tx_power != null ? parseFloat(h.tx_power.toFixed(2)) : null,
    })), [raw]);

  const stats = useMemo(() => {
    const rxVals = raw.map(h => h.rx_power).filter(v => v != null);
    const txVals = raw.map(h => h.tx_power).filter(v => v != null);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return rxVals.length ? {
      rxMin: Math.min(...rxVals), rxMax: Math.max(...rxVals), rxAvg: avg(rxVals),
      txMin: Math.min(...txVals), txMax: Math.max(...txVals), txAvg: avg(txVals),
    } : null;
  }, [raw]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Range picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Historial de Señal</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['24h', '7d', '30d'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              background: range === r ? 'rgba(31,111,235,0.15)' : 'transparent',
              color: range === r ? 'var(--cyan)' : 'var(--text-muted)',
              border: `1px solid ${range === r ? 'rgba(31,111,235,0.4)' : 'var(--border)'}`,
            }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
        {isLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="rxGradFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#79c0ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#79c0ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="txGradFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="ts" type="number" domain={['auto','auto']} scale="time"
                tickFormatter={v => {
                  const d = new Date(v);
                  return range === '24h'
                    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                    : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                }}
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis domain={[-32, -2]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="rx" stroke="#79c0ff" fill="url(#rxGradFull)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="tx" stroke="#3fb950" fill="url(#txGradFull)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          {[['#79c0ff', 'RX Power'], ['#3fb950', 'TX Power']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 2, background: c, borderRadius: 1 }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'RX Mín',  value: stats.rxMin, color: 'var(--red)'   },
            { label: 'RX Máx',  value: stats.rxMax, color: 'var(--green)' },
            { label: 'RX Prom', value: stats.rxAvg, color: 'var(--cyan)'  },
            { label: 'TX Mín',  value: stats.txMin, color: 'var(--red)'   },
            { label: 'TX Máx',  value: stats.txMax, color: 'var(--green)' },
            { label: 'TX Prom', value: stats.txAvg, color: 'var(--cyan)'  },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
              <div className="mono" style={{ fontSize: 14, color, fontWeight: 600 }}>
                {value != null ? `${value.toFixed(1)}` : '—'}
                {value != null && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>dBm</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quality indicator */}
      {stats && (() => {
        const meta = getSignalMeta(stats.rxAvg);
        return (
          <div style={{ padding: '10px 14px', background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Calidad de Señal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                RX Promedio: <span className={`mono ${meta.cls}`}>{stats.rxAvg?.toFixed(2)} dBm</span>
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── ONT Drawer ─────────────────────────────────────────────────────────── */
const DRAWER_TABS = ['Resumen', 'Señal', 'Servicios', 'WAN/IP', 'DHCP', 'Eventos'];

function ONTDrawer({ ont, onClose }) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const { data: dhcpLeases = [], isLoading: dhcpLoading } = useQuery({
    queryKey: ['dhcp-leases', ont?.id],
    queryFn: () =>
      ontAPI.dhcpLeases(ont.id)
        .then(r => r.data?.data || r.data || [])
        ,
    enabled: !!ont?.id && tab === 4,
    staleTime: 60000,
  });

  if (!ont) return null;

  const events = [];
  const EVENT_COLOR  = { info: 'var(--cyan)', warning: 'var(--orange)', error: 'var(--red)' };
  const EVENT_BADGE  = { info: 'badge-blue',  warning: 'badge-orange',  error: 'badge-red' };

  const InfoRow = ({ label, value, mono = false }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </span>
    </div>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ width: 560 }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <IconWifi size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {ont.serial_number}
              </span>
              <StatusBadge status={ont.status} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="mono">{ont.mac}</span>
              {ont.client && <span style={{ color: 'var(--cyan)' }}>· {ont.client.name}</span>}
              {ont.olt   && <span style={{ color: 'var(--text-muted)' }}>· {ont.olt.name}</span>}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ flexShrink: 0, marginLeft: 12 }}>
            <IconX size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ flexShrink: 0, padding: '0 20px' }}>
          {DRAWER_TABS.map((t, i) => (
            <div key={t} className={`tab-item ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>
              {t}
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── Tab 0: Resumen ── */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Información del Equipo
                </div>
                <InfoRow label="Serial"       value={ont.serial_number} mono />
                <InfoRow label="MAC"           value={ont.mac}           mono />
                <InfoRow label="OLT"           value={ont.olt?.name} />
                <InfoRow label="Interfaz"      value={ont.description}   mono />
                <InfoRow label="Cliente"       value={ont.client?.name} />
                <InfoRow label="Estado"        value={<StatusBadge status={ont.status} />} />
                {ont.model      && <InfoRow label="Modelo"   value={ont.model} />}
                {ont.firmware   && <InfoRow label="Firmware" value={ont.firmware} mono />}
                {ont.vlan       && <InfoRow label="VLAN"     value={ont.vlan} mono />}
                {ont.ip_address && <InfoRow label="IP"       value={ont.ip_address} mono />}
              </div>

              {/* Métricas ópticas */}
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Métricas Ópticas
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>RX / TX power</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SignalValue value={ont.rx_power} size="md" />
                    <span style={{ color: 'var(--text-muted)' }}>/</span>
                    <SignalValue value={ont.tx_power} size="md" />
                  </div>
                </div>
                <InfoRow label="OLT RX power"  value={ont.olt_rx_power != null ? `${ont.olt_rx_power} dBm` : null} mono />
                <InfoRow label="Distancia"     value={ont.distance != null ? `${ont.distance} m` : null} mono />
                <InfoRow label="Temperatura"   value={ont.temperature != null ? `${ont.temperature} °C` : null} mono />
                <InfoRow label="Voltaje"       value={ont.voltage != null ? `${ont.voltage} V` : null} mono />
                <InfoRow label="Corriente bias" value={ont.bias_current != null ? `${ont.bias_current} mA` : null} mono />
              </div>

              <MiniSignalChart ontId={ont.id} height={160} />

              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Últimos Eventos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {events.slice(0, 5).map(ev => (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '7px 8px', background: 'var(--content-bg)',
                      borderRadius: 5, border: '1px solid var(--border)',
                    }}>
                      <span className={`badge ${EVENT_BADGE[ev.type]}`} style={{ fontSize: 9, padding: '1px 6px', flexShrink: 0, marginTop: 1 }}>
                        {ev.type.toUpperCase()}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ev.message}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{formatRelative(ev.ts)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 1: Señal ── */}
          {tab === 1 && <SignalTabContent ontId={ont.id} />}

          {/* ── Tab 2: Servicios ── */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Perfiles de Servicio
              </div>
              {[
                { key: 'datos', label: 'Datos',  icon: '🌐', color: 'var(--cyan)',   active: true,  vlan: 100, speed: '100 Mbps ↓ / 50 Mbps ↑' },
                { key: 'voip',  label: 'VoIP',   icon: '📞', color: 'var(--green)',  active: false, vlan: 200, speed: '5 Mbps' },
                { key: 'iptv',  label: 'IPTV',   icon: '📺', color: 'var(--purple)', active: false, vlan: 300, speed: '30 Mbps' },
              ].map(svc => (
                <div key={svc.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 6,
                  background: 'var(--content-bg)',
                  border: `1px solid ${svc.active ? svc.color + '44' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{svc.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{svc.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{svc.speed}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>VLAN {svc.vlan}</span>
                    <span className={`badge ${svc.active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 9, padding: '1px 7px' }}>
                      {svc.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}

              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  VLANs Configuradas
                </div>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>VLAN ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 100, name: 'Datos Internet', type: 'Tagged',   active: true  },
                      { id: 200, name: 'VoIP',           type: 'Tagged',   active: false },
                      { id: 300, name: 'IPTV',           type: 'Tagged',   active: false },
                    ].map(v => (
                      <tr key={v.id}>
                        <td className="mono">{v.id}</td>
                        <td>{v.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{v.type}</td>
                        <td>
                          <span className={`badge ${v.active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 9 }}>
                            {v.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab 3: WAN/IP ── */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                {['DHCP', 'Static', 'PPPoE'].map(m => (
                  <span key={m} className={`badge ${m === 'DHCP' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 11 }}>
                    {m}
                  </span>
                ))}
              </div>
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Configuración WAN
                </div>
                <InfoRow label="Modo"          value={<span className="badge badge-blue" style={{ fontSize: 10 }}>DHCP</span>} />
                <InfoRow label="Dirección IP"  value={ont.ip_address || '192.168.1.100'} mono />
                <InfoRow label="Gateway"       value="192.168.1.1"                       mono />
                <InfoRow label="DNS Primario"  value="8.8.8.8"                           mono />
                <InfoRow label="DNS Secundario" value="8.8.4.4"                          mono />
                <InfoRow label="MAC Binding"   value={ont.mac}                   mono />
              </div>
              <div style={{
                padding: '10px 14px', background: 'rgba(63,185,80,0.06)',
                border: '1px solid rgba(63,185,80,0.25)', borderRadius: 6,
                fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span className="status-dot status-online" />
                Conexión WAN activa · Modo DHCP
              </div>
            </div>
          )}

          {/* ── Tab 4: DHCP ── */}
          {tab === 4 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Leases DHCP Activos
              </div>
              {dhcpLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spinner" /></div>
              ) : dhcpLeases.length === 0 ? (
                <div className="empty-state">No active DHCP leases</div>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr><th>MAC</th><th>IP</th><th>Hostname</th><th>Expira</th></tr>
                  </thead>
                  <tbody>
                    {dhcpLeases.map(l => (
                      <tr key={l.id}>
                        <td className="mono" style={{ fontSize: 11 }}>{l.mac}</td>
                        <td className="mono" style={{ color: 'var(--cyan)' }}>{l.ip}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{l.hostname || '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.expires ? formatRelative(l.expires) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Tab 5: Eventos ── */}
          {tab === 5 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Log de Eventos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map(ev => (
                  <div key={ev.id} style={{
                    padding: '10px 12px', borderRadius: 6,
                    background: 'var(--content-bg)',
                    border: `1px solid ${EVENT_COLOR[ev.type]}33`,
                    borderLeft: `3px solid ${EVENT_COLOR[ev.type]}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className={`badge ${EVENT_BADGE[ev.type]}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                        {ev.type.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatRelative(ev.ts)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ev.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Sortable column header ─────────────────────────────────────────────── */
function SortTh({ children, sortKey, sortState, onSort, style }) {
  const [key, dir] = sortState;
  const active = key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none', ...style }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <span style={{ opacity: active ? 1 : 0.25, color: 'var(--accent)', lineHeight: 1 }}>
          {active && dir === 'asc' ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
        </span>
      </span>
    </th>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ONTs() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search,       setSearch]       = useState('');
  const [filterOLT,    setFilterOLT]    = useState('');
  const [filterPort,   setFilterPort]   = useState('');
  const [filterSignal, setFilterSignal] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortState,    setSortState]    = useState(['serial_number', 'asc']);
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState(new Set());
  const [drawerONT,    setDrawerONT]    = useState(null);

  /* ── Queries ── */
  const { data: ontsResp, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['onts'],
    queryFn: () =>
      ontAPI.list({ limit: 500 })
        .then(r => r.data?.data || r.data?.results || r.data || [])
        ,
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: oltsResp } = useQuery({
    queryKey: ['olts-list'],
    queryFn: () =>
      oltAPI.list()
        .then(r => r.data?.data || r.data?.results || r.data || [])
        .catch(() => []),
    retry: 1,
  });

  const rawONTs = useMemo(() => {
    const list = Array.isArray(ontsResp) ? ontsResp : [];
    return list;
  }, [ontsResp]);

  const olts = useMemo(() => {
    const list = Array.isArray(oltsResp) ? oltsResp : [];
    if (list.length > 0) return list;
    const seen = new Set();
    return rawONTs
      .filter(o => o.olt)
      .map(o => o.olt)
      .filter(olt => { if (seen.has(olt.id)) return false; seen.add(olt.id); return true; });
  }, [oltsResp, rawONTs]);

  const ponPorts = useMemo(() => {
    const seen = new Set();
    return rawONTs
      .map(o => o.description)
      .filter(p => { if (!p || seen.has(p)) return false; seen.add(p); return true; })
      .sort();
  }, [rawONTs]);

  /* ── Mutations ── */
  const rebootMut = useMutation({
    mutationFn: (id) => ontAPI.reboot(id),
    onSuccess: () => { toast.success('Reinicio enviado'); queryClient.invalidateQueries({ queryKey: ['onts'] }); },
    onError: () => toast.error('Error al reiniciar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => ontAPI.delete(id),
    onSuccess: () => { toast.success('ONT eliminado'); queryClient.invalidateQueries({ queryKey: ['onts'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  /* ── Sort ── */
  const handleSort = useCallback((key) => {
    setSortState(([pk, pd]) => pk === key ? [key, pd === 'asc' ? 'desc' : 'asc'] : [key, 'asc']);
    setPage(1);
  }, []);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const st = o => (o.status || '').toLowerCase();
    const total   = rawONTs.length;
    const online  = rawONTs.filter(o => st(o) === 'online').length;
    const offline = rawONTs.filter(o => st(o) === 'offline').length;
    const los     = rawONTs.filter(o => st(o) === 'los').length;
    const ztp     = rawONTs.filter(o => ['ztp','pending'].includes(st(o))).length;
    const rxVals  = rawONTs.map(o => o.rx_power).filter(v => v != null);
    const avgRx   = rxVals.length ? rxVals.reduce((a, b) => a + b, 0) / rxVals.length : null;
    return { total, online, offline, los, ztp, avgRx };
  }, [rawONTs]);

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    let list = [...rawONTs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.serial_number?.toLowerCase().includes(q) ||
        o.mac?.toLowerCase().includes(q) ||
        o.client?.name?.toLowerCase().includes(q) ||
        o.ip_address?.toLowerCase().includes(q)
      );
    }
    if (filterOLT)    list = list.filter(o => String(o.olt?.id) === filterOLT);
    if (filterPort)   list = list.filter(o => o.description === filterPort);
    if (filterSignal) list = list.filter(o => getSignalMeta(o.rx_power).key === filterSignal);
    if (filterStatus) {
      if (filterStatus === 'ztp') list = list.filter(o => ['ztp','pending'].includes((o.status||'').toLowerCase()));
      else                        list = list.filter(o => (o.status||'').toLowerCase() === filterStatus);
    }

    const [key, dir] = sortState;
    const GET = {
      serial_number: o => o.serial_number,
      client:        o => o.client?.name || '',
      olt:           o => o.olt?.name || '',
      pon_port:      o => o.description || '',
      rx_power:      o => o.rx_power ?? -999,
      tx_power:      o => o.tx_power ?? -999,
      distance:      o => o.distance ?? 0,
      status:        o => o.status || '',
      last_seen:     o => o.last_seen || '',
    };
    if (GET[key]) {
      list.sort((a, b) => {
        const av = GET[key](a), bv = GET[key](b);
        if (av < bv) return dir === 'asc' ? -1 :  1;
        if (av > bv) return dir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    return list;
  }, [rawONTs, search, filterOLT, filterPort, filterSignal, filterStatus, sortState]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Selection ── */
  const allVisible = pageData.length > 0 && pageData.every(o => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allVisible) {
      setSelected(s => { const n = new Set(s); pageData.forEach(o => n.delete(o.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); pageData.forEach(o => n.add(o.id)); return n; });
    }
  };
  const toggleOne = (id) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  /* ── Batch actions ── */
  const handleBatchReboot = () => {
    if (!confirm(`¿Reiniciar ${selected.size} ONT(s) seleccionados?`)) return;
    selected.forEach(id => rebootMut.mutate(id));
    clearSel();
  };
  const handleBatchDelete = () => {
    if (!confirm(`¿Eliminar ${selected.size} ONT(s)? Esta acción no se puede deshacer.`)) return;
    selected.forEach(id => deleteMut.mutate(id));
    clearSel();
  };
  const handleBatchPing = () => {
    toast.success(`Ping masivo enviado a ${selected.size} ONT(s) (simulado)`);
    clearSel();
  };

  /* ── Row actions ── */
  const handleReboot = (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Reiniciar este ONT?')) return;
    rebootMut.mutate(id);
  };
  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este ONT? Esta acción no se puede deshacer.')) return;
    deleteMut.mutate(id);
  };

  /* ── Filter options ── */
  const STATUS_PILLS = [
    { key: '',        label: 'All'          },
    { key: 'online',  label: 'Online'       },
    { key: 'offline', label: 'Offline'      },
    { key: 'los',     label: 'LOS'          },
    { key: 'ztp',     label: 'Unconfigured' },
  ];
  const SIGNAL_OPTS = [
    { key: '',         label: 'Signal: Any' },
    { key: 'optimal',  label: 'Optimal'     },
    { key: 'normal',   label: 'Normal'      },
    { key: 'warn',     label: 'Warning'     },
    { key: 'critical', label: 'Critical'    },
    { key: 'unknown',  label: 'Unknown'     },
  ];

  const hasFilters = search || filterOLT || filterPort || filterSignal || filterStatus;

  const avgRxMeta  = getSignalMeta(stats.avgRx);

  /* ── Pagination helpers ── */
  const visiblePages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end   = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">Configured ONUs</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{filtered.length}</span>
          {isFetching && !isLoading && <span className="polling-dot" title="Updating…" />}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" onClick={() => toast.success('Export ONUs (próximamente)')}>
            <IconDownload size={13} /> Export
          </button>
          <button className="btn" onClick={() => toast.success('Import ONUs (próximamente)')}>
            <IconUpload size={13} /> Import
          </button>
          <button className="btn" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh size={13} style={{ animation: isFetching ? 'spin-slow 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Total ONTs</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Online</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.online}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Offline</div>
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{stats.offline}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">LOS</div>
          <div className="stat-value" style={{ color: stats.los > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{stats.los}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Promedio RX</div>
          <div className="stat-value" style={{ fontSize: 15, color: getSignalCssColor(avgRxMeta.cls) }}>
            {stats.avgRx != null ? `${stats.avgRx.toFixed(1)} dBm` : '—'}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">ZTP Pendientes</div>
          <div className="stat-value" style={{ color: stats.ztp > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>{stats.ztp}</div>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input-base"
            style={{ paddingLeft: 28 }}
            placeholder="Search SN, MAC, name, IP…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* OLT */}
        <select className="select-base" style={{ minWidth: 130 }} value={filterOLT} onChange={e => { setFilterOLT(e.target.value); setPage(1); }}>
          <option value="">All OLTs</option>
          {olts.map(o => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
        </select>

        {/* PON port */}
        <select className="select-base" style={{ minWidth: 130 }} value={filterPort} onChange={e => { setFilterPort(e.target.value); setPage(1); }}>
          <option value="">All ports</option>
          {ponPorts.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Signal quality */}
        <select className="select-base" style={{ minWidth: 148 }} value={filterSignal} onChange={e => { setFilterSignal(e.target.value); setPage(1); }}>
          {SIGNAL_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_PILLS.map(pill => (
            <button
              key={pill.key}
              onClick={() => { setFilterStatus(pill.key); setPage(1); }}
              style={{
                padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', border: '1px solid', transition: 'all 0.12s',
                borderColor: filterStatus === pill.key ? 'var(--accent)' : 'var(--border)',
                background:  filterStatus === pill.key ? 'rgba(31,111,235,0.15)' : 'transparent',
                color:       filterStatus === pill.key ? 'var(--cyan)' : 'var(--text-secondary)',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Clear */}
        {hasFilters && (
          <button className="btn-icon" onClick={() => { setSearch(''); setFilterOLT(''); setFilterPort(''); setFilterSignal(''); setFilterStatus(''); setPage(1); }} title="Limpiar filtros">
            <IconX size={13} />
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 24, height: 24, margin: '0 auto 10px', display: 'block' }} />
            Loading ONUs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <IconWifi size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />
            <div>No ONUs found</div>
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Try adjusting the filters</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-base">
              <thead>
                <tr>
                  {/* Checkbox */}
                  <th style={{ width: 38, textAlign: 'center', paddingLeft: 12 }}>
                    <input type="checkbox" className="checkbox" checked={allVisible} onChange={toggleAll} />
                  </th>
                  <SortTh sortKey="status"         sortState={sortState} onSort={handleSort}>Status</SortTh>
                  <th style={{ width: 64, textAlign: 'center' }}>View</th>
                  <SortTh sortKey="client"        sortState={sortState} onSort={handleSort}>Name</SortTh>
                  <SortTh sortKey="serial_number" sortState={sortState} onSort={handleSort}>SN / MAC</SortTh>
                  <SortTh sortKey="olt"            sortState={sortState} onSort={handleSort}>OLT</SortTh>
                  <SortTh sortKey="pon_port"       sortState={sortState} onSort={handleSort}>ONU / PON</SortTh>
                  <SortTh sortKey="rx_power"       sortState={sortState} onSort={handleSort} style={{ textAlign: 'right' }}>Signal RX</SortTh>
                  <SortTh sortKey="tx_power"       sortState={sortState} onSort={handleSort} style={{ textAlign: 'right' }}>B/R TX</SortTh>
                  <SortTh sortKey="distance"       sortState={sortState} onSort={handleSort} style={{ textAlign: 'right' }}>Distance</SortTh>
                  <SortTh sortKey="last_seen"      sortState={sortState} onSort={handleSort}>Last seen</SortTh>
                  <th style={{ textAlign: 'center', width: 92 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map(ont => (
                  <tr
                    key={ont.id}
                    onClick={() => setDrawerONT(ont)}
                    style={{ cursor: 'pointer', background: selected.has(ont.id) ? 'rgba(31,111,235,0.06)' : undefined }}
                  >
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="checkbox" checked={selected.has(ont.id)} onChange={() => toggleOne(ont.id)} />
                    </td>

                    {/* Status */}
                    <td><StatusBadge status={ont.status} /></td>

                    {/* View (botón azul SmartOLT) → página completa de gestión */}
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }}
                        onClick={() => navigate(`/onts/view/${ont.id}`)}>
                        <IconEye size={12} /> View
                      </button>
                    </td>

                    {/* Name */}
                    <td>
                      {ont.client ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <IconUser size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12 }}>{ont.client.name}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* SN / MAC */}
                    <td>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.3 }}>{ont.serial_number}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{ont.mac || '—'}</div>
                    </td>

                    {/* OLT + BrandTag */}
                    <td>
                      <div style={{ fontSize: 12, lineHeight: 1.3 }}>{ont.olt?.name || '—'}</div>
                      {ont.olt?.brand && <div style={{ marginTop: 2 }}><BrandTag brand={ont.olt.brand} /></div>}
                    </td>

                    {/* ONU / PON */}
                    <td>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ont.description || ont.pon_port || '—'}</span>
                    </td>

                    {/* Signal RX */}
                    <td style={{ textAlign: 'right' }}>
                      <SignalValue value={ont.rx_power} size="sm" />
                    </td>

                    {/* B/R TX */}
                    <td style={{ textAlign: 'right' }}>
                      <SignalValue value={ont.tx_power} size="sm" />
                    </td>

                    {/* Distance */}
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {formatDist(ont.distance)}
                      </span>
                    </td>

                    {/* Last seen */}
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelative(ont.last_seen)}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button className="btn-icon tooltip" data-tip="Reboot"
                          onClick={e => handleReboot(e, ont.id)}
                          disabled={rebootMut.isPending}
                          style={{ padding: 4 }}>
                          <IconPower size={12} />
                        </button>
                        <button className="btn-icon tooltip" data-tip="Delete"
                          onClick={e => handleDelete(e, ont.id)}
                          style={{ padding: 4, color: 'var(--red)' }}>
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }}
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ‹ Prev
              </button>
              {visiblePages.map(n => (
                <button key={n} className="btn" style={{
                  padding: '3px 8px', fontSize: 12, minWidth: 30,
                  background:   page === n ? 'var(--accent)' : undefined,
                  borderColor:  page === n ? 'var(--accent)' : undefined,
                  color:        page === n ? '#fff' : undefined,
                }} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }}
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch action bar */}
      {someSelected && (
        <div className="batch-bar">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {selected.size} selected
          </span>
          <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />
          <button className="btn" style={{ fontSize: 12 }} onClick={handleBatchReboot}>
            <IconPower size={13} /> Reboot
          </button>
          <button className="btn" style={{ fontSize: 12 }} onClick={handleBatchPing}>
            <IconGauge size={13} /> Ping
          </button>
          <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleBatchDelete}>
            <IconTrash size={13} /> Delete
          </button>
          <button className="btn-icon" onClick={clearSel} title="Cancel">
            <IconX size={13} />
          </button>
        </div>
      )}

      {/* Drawer */}
      {drawerONT && (
        <ONTDrawer ont={drawerONT} onClose={() => setDrawerONT(null)} />
      )}
    </div>
  );
}
