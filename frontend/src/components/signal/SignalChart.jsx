import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { useSignalHistory } from '../../hooks/useSignal';

const RANGES = ['24h', '7d', '30d'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#1A2235', border: '1px solid #1E2D45', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="text-gray-500 mb-1">{new Date(label).toLocaleString('es-AR')}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey.toUpperCase()}: {p.value?.toFixed(2)} dBm
        </div>
      ))}
    </div>
  );
}

export default function SignalChart({ ontId }) {
  const [range, setRange] = useState('24h');
  const { data: history = [], isLoading } = useSignalHistory(ontId, range);

  const chartData = history.map(h => ({
    timestamp: new Date(h.timestamp).getTime(),
    rx: h.rx_power,
    tx: h.tx_power,
  }));

  return (
    <div className="rounded-lg p-4" style={{ background: '#1A2235', border: '1px solid #1E2D45' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-400">Historial de Señal</span>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
              style={{
                background: range === r ? '#00D4FF22' : 'transparent',
                color: range === r ? '#00D4FF' : '#6B7280',
                border: `1px solid ${range === r ? '#00D4FF44' : '#1E2D45'}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-600 text-xs">Cargando...</div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-600 text-xs">Sin datos de señal</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF94" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
            <XAxis dataKey="timestamp" type="number" domain={['auto', 'auto']} scale="time"
              tickFormatter={v => new Date(v).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              tick={{ fontSize: 9, fill: '#6B7280', fontFamily: 'IBM Plex Mono' }} />
            <YAxis domain={[-32, -4]} tick={{ fontSize: 9, fill: '#6B7280', fontFamily: 'IBM Plex Mono' }}
              tickFormatter={v => `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={-27} stroke="#FF3B5C" strokeDasharray="4 2" label={{ value: 'LOS', fill: '#FF3B5C', fontSize: 9 }} />
            <ReferenceLine y={-8} stroke="#A855F7" strokeDasharray="4 2" label={{ value: 'HIGH', fill: '#A855F7', fontSize: 9 }} />
            <Area type="monotone" dataKey="rx" stroke="#00D4FF" fill="url(#rxGrad)" strokeWidth={1.5} dot={false} name="rx" />
            <Area type="monotone" dataKey="tx" stroke="#00FF94" fill="url(#txGrad)" strokeWidth={1.5} dot={false} name="tx" />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5" style={{ background: '#00D4FF' }} />
          <span className="text-[9px] text-gray-500 font-mono">RX Power</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5" style={{ background: '#00FF94' }} />
          <span className="text-[9px] text-gray-500 font-mono">TX Power</span>
        </div>
      </div>
    </div>
  );
}
