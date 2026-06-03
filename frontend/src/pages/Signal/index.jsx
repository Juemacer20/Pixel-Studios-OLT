import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ontAPI } from '../../services/api';
import SignalValue from '../../components/shared/SignalValue';
import { IconPlus, IconX, IconSearch } from '@tabler/icons-react';

const COLORS = ['#3fb950','#79c0ff','#bc8cff','#d29922','#f85149'];

  id: i + 1,
  serial_number: `HWTC${String(i * 7 + 1234567).padStart(8, '0')}`,
  client: i % 3 === 0 ? null : { name: `Cliente ${i + 1}` },
  olt: { name: `OLT-${(i % 4) + 1}` },
  rx_power: -(16 + (i * 3 % 14)),
  tx_power: -(2 + i % 4),
}));

function buildHistory(ontId, range) {
  const now    = Date.now();
  const points = range === '7d' ? 84 : range === '30d' ? 60 : 48;
  const step   = range === '7d' ? 2 * 3600_000 : range === '30d' ? 12 * 3600_000 : 30 * 60_000;
  const base   = -(18 + (ontId % 8));
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i) * step,
    [`rx_${ontId}`]: parseFloat((base + (Math.random() - 0.5) * 2).toFixed(2)),
  }));
}

const DIST_BUCKETS = [
  { range: '-15 to -20', label: '-15~-20', color: '#3fb950' },
  { range: '-20 to -23', label: '-20~-23', color: '#79c0ff' },
  { range: '-23 to -25', label: '-23~-25', color: '#d29922' },
  { range: '-25 to -27', label: '-25~-27', color: '#f85149' },
  { range: '< -27',      label: '< -27',   color: '#bc8cff' },
];

function buildDistribution(onts) {
  const buckets = { '-15~-20': 0, '-20~-23': 0, '-23~-25': 0, '-25~-27': 0, '< -27': 0 };
  onts.forEach(o => {
    const v = o.rx_power;
    if (v == null) return;
    if (v >= -20) buckets['-15~-20']++;
    else if (v >= -23) buckets['-20~-23']++;
    else if (v >= -25) buckets['-23~-25']++;
    else if (v >= -27) buckets['-25~-27']++;
    else buckets['< -27']++;
  });
  return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontFamily: 'monospace' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {new Date(label).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: {p.value != null ? `${p.value.toFixed(2)} dBm` : '—'}
        </div>
      ))}
    </div>
  );
};

export default function Signal() {
  const [range,       setRange]       = useState('24h');
  const [selected,    setSelected]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [showPicker,  setShowPicker]  = useState(false);

  const { data: ontsRaw } = useQuery({
    queryKey: ['onts'],
    queryFn: () => ontAPI.list({ limit: 200 }).then(r => r.data?.data ?? r.data),
    retry: 1,
  });
  const allONTs = data || [];

  // Build merged chart data for selected ONTs
  const chartData = (() => {
    if (!selected.length) return [];
    const histories = selected.map(ont => buildHistory(ont.id, range));
    if (!histories.length) return [];
    return histories[0].map((point, i) => {
      const merged = { timestamp: point.timestamp };
      histories.forEach((h, idx) => {
        const key = `rx_${selected[idx].id}`;
        merged[key] = h[i]?.[key] ?? null;
      });
      return merged;
    });
  })();

  const distData = buildDistribution(allONTs);
  const sorted   = [...allONTs].sort((a, b) => (a.rx_power ?? -99) - (b.rx_power ?? -99));
  const worst10  = sorted.slice(0, 10);
  const best10   = sorted.slice(-10).reverse();

  const tickFmt = v => {
    const d = new Date(v);
    if (range === '24h') return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const filteredONTs = allONTs.filter(o =>
    o.serial_number.toLowerCase().includes(search.toLowerCase()) ||
    o.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const addONT = ont => {
    if (selected.length >= 5 || selected.find(s => s.id === ont.id)) return;
    setSelected(prev => [...prev, ont]);
    setShowPicker(false);
    setSearch('');
  };

  const removeONT = id => setSelected(prev => prev.filter(s => s.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <span className="page-title">Señal</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['24h','7d','30d'].map(r => (
            <button key={r} className="btn"
              style={{ padding: '3px 10px', fontSize: 12,
                background: range === r ? 'rgba(31,111,235,0.15)' : undefined,
                borderColor: range === r ? 'var(--accent)' : undefined,
                color: range === r ? 'var(--accent-hover)' : undefined,
              }}
              onClick={() => setRange(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* ONT selector */}
      <div className="card" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Comparar ONTs (máx 5):</span>
          {selected.map((ont, idx) => (
            <span key={ont.id} className="badge badge-blue" style={{ gap: 6 }}>
              <span className="mono" style={{ fontSize: 10 }}>{ont.serial_number.slice(-8)}</span>
              <button onClick={() => removeONT(ont.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <IconX size={11} />
              </button>
            </span>
          ))}
          {selected.length < 5 && (
            <div style={{ position: 'relative' }}>
              <button className="btn" onClick={() => setShowPicker(p => !p)} style={{ padding: '3px 8px', fontSize: 12 }}>
                <IconPlus size={12} /> Agregar ONT
              </button>
              {showPicker && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
                  background: 'var(--sidebar-bg)', border: '1px solid var(--border)',
                  borderRadius: 6, width: 280, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative' }}>
                      <IconSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input className="input-base" style={{ paddingLeft: 28, fontSize: 12 }}
                        value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ONT..." autoFocus />
                    </div>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {filteredONTs.slice(0, 20).map(ont => (
                      <div key={ont.id} onClick={() => addONT(ont)}
                        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="mono" style={{ fontSize: 11 }}>{ont.serial_number}</span>
                        <SignalValue value={ont.rx_power} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-ONT line chart */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Historial de señal RX {selected.length === 0 && '— selecciona ONTs para comparar'}
        </div>
        {selected.length === 0 ? (
          <div className="empty-state" style={{ height: 180 }}>
            <IconSearch size={32} style={{ margin: '0 auto 8px', color: 'var(--text-muted)', display: 'block' }} />
            <div>Agrega hasta 5 ONTs para comparar su señal en el tiempo</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="timestamp" type="number" scale="time" domain={['auto','auto']}
                tickFormatter={tickFmt} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis domain={[-32,-12]} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
                tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }} />
              {selected.map((ont, idx) => (
                <Line key={ont.id} type="monotone" dataKey={`rx_${ont.id}`}
                  stroke={COLORS[idx]} strokeWidth={1.5} dot={false}
                  name={ont.serial_number.slice(-8)} activeDot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Distribution chart */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Distribución de señal
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={distData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border)', fontSize: 11 }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[3,3,0,0]} name="ONTs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Worst 10 */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
            Top 10 — Peor señal
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {worst10.map((ont, i) => (
              <div key={ont.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 16 }}>{i+1}</span>
                <span className="mono" style={{ fontSize: 11, flex: 1 }}>{ont.serial_number.slice(-8)}</span>
                <SignalValue value={ont.rx_power} size="xs" />
              </div>
            ))}
          </div>
        </div>

        {/* Best 10 */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
            Top 10 — Mejor señal
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {best10.map((ont, i) => (
              <div key={ont.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 16 }}>{i+1}</span>
                <span className="mono" style={{ fontSize: 11, flex: 1 }}>{ont.serial_number.slice(-8)}</span>
                <SignalValue value={ont.rx_power} size="xs" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
