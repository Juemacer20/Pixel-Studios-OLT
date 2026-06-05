import React, { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

function MiniChart({ points, color }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels = (points || []).map(p => new Date(p[0]));
    const data = (points || []).map(p => p[1]);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [JSON.stringify(points), color]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

export default function OltCard({ olt }) {
  const { name, current = {}, tempHistory = [], cpuHistory = [] } = olt;

  const fmt = (v, unit) => (v != null && !isNaN(v) ? `${Number(v).toFixed(1)}${unit}` : '—');

  const avg = (arr) => {
    const vals = arr.map(p => p[1]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const max = (arr) => {
    const vals = arr.map(p => p[1]).filter(v => v != null);
    return vals.length ? Math.max(...vals) : null;
  };

  return (
    <div
      style={{
        background: 'rgba(14,34,54,0.72)',
        border: '1px solid var(--border)',
        borderRadius: 11,
        padding: 14,
        backdropFilter: 'blur(4px)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        {name}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          Daily OLT environment temperature
        </div>
        <div style={{ height: 72, marginBottom: 6 }}>
          {tempHistory.length > 1 ? (
            <MiniChart points={tempHistory} color="#4285f4" />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              No data yet
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { label: 'Current', value: fmt(current.temp, '°C') },
            { label: 'Average', value: fmt(avg(tempHistory), '°C') },
            { label: 'Maximum', value: fmt(max(tempHistory), '°C') },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          Daily CPU usage
        </div>
        <div style={{ height: 72, marginBottom: 6 }}>
          {cpuHistory.length > 1 ? (
            <MiniChart points={cpuHistory} color="#00FF94" />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              No data yet
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { label: 'Current', value: fmt(current.cpu, '%') },
            { label: 'Average', value: fmt(avg(cpuHistory), '%') },
            { label: 'Maximum', value: fmt(max(cpuHistory), '%') },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
