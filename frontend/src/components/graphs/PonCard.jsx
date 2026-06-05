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
          backgroundColor: `rgba(43, 127, 212, 0.15)`,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
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

export default function PonCard({ pon }) {
  const { oltName, portKey, avgNow, avgPeriod, minPeriod, points = [] } = pon;

  const fmt = v => (v != null && !isNaN(v) ? `${Number(v).toFixed(2)} dBm` : '—');

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
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{oltName}</div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {portKey} — daily signal
      </div>

      <div style={{ height: 80, marginBottom: 10 }}>
        {points.length > 1 ? (
          <MiniChart points={points} color="#2b7fd4" />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            No data yet
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {[
          { label: 'Current', value: fmt(avgNow) },
          { label: 'Average', value: fmt(avgPeriod) },
          { label: 'Minimum', value: fmt(minPeriod) },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
