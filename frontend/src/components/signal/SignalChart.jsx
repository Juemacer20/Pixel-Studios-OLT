import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { ontAPI } from '../../services/api';

// ─── Design-system colours ───────────────────────────────────────────────────
const COLOR_RX = '#3fb950'; // green
const COLOR_TX = '#79c0ff'; // cyan/blue

// ─── Range selector options ──────────────────────────────────────────────────
const RANGES = ['24h', '7d', '30d'];

// ─── Mock signal history generator ───────────────────────────────────────────
function buildMockHistory(range) {
  const now    = Date.now();
  const points = range === '30d' ? 60 : range === '7d' ? 84 : 48;
  const step   = range === '30d' ? 12 * 3600_000 : range === '7d' ? 2 * 3600_000 : 30 * 60_000;

  return Array.from({ length: points }, (_, i) => {
    const noise = (Math.random() - 0.5) * 1.5;
    return {
      timestamp: now - (points - i) * step,
      rx_power:  parseFloat((-21.5 + noise).toFixed(2)),
      tx_power:  parseFloat((-8.3  + (Math.random() - 0.5) * 0.6).toFixed(2)),
    };
  });
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function SignalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: 'var(--sidebar-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 11,
        fontFamily: "'SFMono-Regular', Consolas, monospace",
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
        {new Date(label).toLocaleString('es-AR', {
          day:    '2-digit',
          month:  '2-digit',
          hour:   '2-digit',
          minute: '2-digit',
        })}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.dataKey.toUpperCase()}: {p.value != null ? `${p.value.toFixed(2)} dBm` : '—'}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * SignalChart — area chart for RX / TX optical power history.
 *
 * @param {string|number} ontId   - ONT identifier
 * @param {string}        range   - '24h' | '7d' | '30d' (default '24h')
 * @param {number}        height  - chart area height in px (default 200)
 */
export default function SignalChart({ ontId, range: rangeProp = '24h', height = 200 }) {
  const [range, setRange] = useState(rangeProp);
  const live = range === 'LIVE';

  const { data: rawHistory, isLoading, isError } = useQuery({
    queryKey: ['signal-history', ontId, range],
    queryFn: () => ontAPI.signalHistory(ontId, range).then((r) => r.data?.data ?? r.data),
    enabled: !!ontId && !live,
    staleTime:        60_000,
    refetchInterval: 300_000,
    retry: 1,
  });

  // ── Modo LIVE: poll /signal cada 3s y acumula puntos en memoria ──
  const [liveBuf, setLiveBuf] = useState([]);
  const liveRef = useRef(live); liveRef.current = live;
  useEffect(() => {
    if (!live || !ontId) return;
    setLiveBuf([]);
    let cancel = false;
    const tick = async () => {
      try {
        const r = await ontAPI.signal(ontId);
        const s = r.data?.data ?? r.data;
        if (!cancel && s) setLiveBuf((b) => [...b.slice(-59), { timestamp: Date.now(), rx_power: s.rx_power, tx_power: s.tx_power }]);
      } catch { /* ignora */ }
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { cancel = true; clearInterval(iv); };
  }, [live, ontId]);

  // Fall back to mock data when API is unavailable or returns nothing
  const history = live
    ? liveBuf
    : (isError || !rawHistory || rawHistory.length === 0 ? buildMockHistory(range) : rawHistory);

  const chartData = history.map((h) => ({
    timestamp: typeof h.timestamp === 'string' ? new Date(h.timestamp).getTime() : h.timestamp,
    rx:        h.rx_power,
    tx:        h.tx_power,
  }));

  // X-axis tick formatter
  const tickFormatter = (v) => {
    const d = new Date(v);
    if (range === '24h') {
      return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div
      className="card"
      style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Signal history
          {isError && (
            <span style={{ color: 'var(--orange)', marginLeft: 8, fontWeight: 400 }}>
              (demo)
            </span>
          )}
        </span>

        {/* Range picker + LIVE */}
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="btn"
              style={{
                padding: '2px 8px',
                fontSize: 11,
                background: range === r ? 'rgba(31,111,235,0.15)' : 'transparent',
                borderColor: range === r ? 'var(--accent)' : 'var(--border)',
                color: range === r ? 'var(--accent-hover)' : 'var(--text-muted)',
              }}
            >
              {r}
            </button>
          ))}
          <button onClick={() => setRange(live ? '24h' : 'LIVE')} className="btn"
            style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              borderColor: live ? 'var(--red)' : 'var(--border)', color: live ? 'var(--red)' : 'var(--text-muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? 'var(--red)' : 'var(--text-muted)',
              boxShadow: live ? '0 0 6px var(--red)' : 'none' }} />
            LIVE
          </button>
        </div>
      </div>

      {/* ── Chart ── */}
      {isLoading ? (
        <div
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
            gap: 8,
          }}
        >
          <span className="spinner" />
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
            <defs>
              <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLOR_RX} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLOR_RX} stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLOR_TX} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLOR_TX} stopOpacity={0}   />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />

            <YAxis
              domain={[-32, -4]}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}`}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />

            <Tooltip content={<SignalTooltip />} />

            {/* Critical threshold: LOS */}
            <ReferenceLine
              y={-27}
              stroke="var(--red)"
              strokeDasharray="4 2"
              strokeOpacity={0.6}
              label={{ value: 'LOS', fill: 'var(--red)', fontSize: 9, position: 'insideTopRight' }}
            />
            {/* High signal threshold */}
            <ReferenceLine
              y={-15}
              stroke="var(--purple)"
              strokeDasharray="4 2"
              strokeOpacity={0.5}
              label={{ value: 'HIGH', fill: 'var(--purple)', fontSize: 9, position: 'insideTopRight' }}
            />

            <Area
              type="monotone"
              dataKey="rx"
              stroke={COLOR_RX}
              fill="url(#rxGrad)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: COLOR_RX }}
              name="RX"
            />
            <Area
              type="monotone"
              dataKey="tx"
              stroke={COLOR_TX}
              fill="url(#txGrad)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: COLOR_TX }}
              name="TX"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 14, height: 2, background: COLOR_RX, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>RX Power</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 14, height: 2, background: COLOR_TX, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>TX Power</span>
        </div>
      </div>
    </div>
  );
}
