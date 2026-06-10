import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Gráfico de tráfico (rx/tx Mbps) de una interfaz, alimentado por /graphs/traffic|uplink.
export default function TrafficCard({ group, oltName, color = '#23a85a' }) {
  const data = (group.points || []).map((p) => ({
    t: new Date(p.t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    rx: p.rx, tx: p.tx,
  }));
  const last = data[data.length - 1] || { rx: 0, tx: 0 };
  const maxRx = Math.max(0, ...data.map((d) => d.rx));
  const maxTx = Math.max(0, ...data.map((d) => d.tx));

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {oltName ? `${oltName} — ` : ''}{group.ifDescr || `if${group.ifIndex}`}
          {group.isUplink && <span className="badge badge-blue" style={{ fontSize: 9, marginLeft: 6 }}>uplink</span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.08)" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#0e2740', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 11 }} />
          <Area type="monotone" dataKey="rx" name="Rx (Mbps)" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} />
          <Area type="monotone" dataKey="tx" name="Tx (Mbps)" stroke="#e08a16" fill="#e08a16" fillOpacity={0.12} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>Rx now: <b style={{ color }}>{last.rx?.toFixed(1)}</b> · max {maxRx.toFixed(1)} Mbps</span>
        <span>Tx now: <b style={{ color: '#e08a16' }}>{last.tx?.toFixed(1)}</b> · max {maxTx.toFixed(1)} Mbps</span>
      </div>
    </div>
  );
}
