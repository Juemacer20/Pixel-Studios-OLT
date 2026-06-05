import React, { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart } from 'chart.js/auto';
import { IconX } from '@tabler/icons-react';
import api from '../../services/api';

function FullChart({ points, color, fill }) {
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
          backgroundColor: fill ? `rgba(245, 132, 17, 0.15)` : 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: !!fill,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${Number(ctx.raw).toFixed(2)} dBm`,
              title: items => new Date(items[0].label).toLocaleString(),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'var(--text-muted)', font: { size: 10 }, maxRotation: 0, maxTicksLimit: 8 },
            grid: { color: 'var(--border)' },
            border: { color: 'var(--border)' },
          },
          y: {
            ticks: { color: 'var(--text-muted)', font: { size: 10, family: 'monospace' }, callback: v => `${v} dBm` },
            grid: { color: 'var(--border)' },
            border: { color: 'var(--border)' },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [JSON.stringify(points), color, fill]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

export default function GraphModal({ ont, onClose }) {
  if (!ont) return null;

  const { data, isLoading } = useQuery({
    queryKey: ['graph-signal-modal', ont.id],
    queryFn: () => api.get(`/graphs/signal/${ont.id}`).then(r => r.data?.data ?? r.data),
    enabled: !!ont.id,
  });

  const points = data?.points || ont.points || [];
  const stats = data?.stats || ont.stats || {};
  const label = ont.description || ont.serial || '—';

  const fmt = v => (v != null && !isNaN(v) ? `${Number(v).toFixed(2)} dBm` : '—');

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fade-in 0.15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          width: '100%', maxWidth: 860,
          padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ont.olt?.name || ''}</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {label} — 30-day signal
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <IconX size={18} />
          </button>
        </div>

        <div style={{ height: 280, marginBottom: 16 }}>
          {isLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : points.length > 1 ? (
            <FullChart points={points} color="#F58411" fill />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No data available
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Current', value: fmt(stats.current) },
            { label: 'Average', value: fmt(stats.avg) },
            { label: 'Minimum', value: fmt(stats.min) },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
