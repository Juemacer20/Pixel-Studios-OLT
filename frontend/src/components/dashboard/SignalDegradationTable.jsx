import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../services/api';

export default function SignalDegradationTable() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'signal-degradation'],
    queryFn: () => dashboardAPI.signalDegradation().then((r) => r.data?.data ?? { rows: [] }),
    refetchInterval: 60000,
  });
  const rows = data?.rows || [];

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="sol-card-h"><span>📉 Signal degradation</span></div>
      <div style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 14 }}>No degraded ONUs</div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Severity</th><th>OLT</th><th>Board/Port</th>
                <th style={{ textAlign: 'right' }}>Avg Δ (dB)</th>
                <th style={{ textAlign: 'right' }}>Max Δ (dB)</th>
                <th style={{ textAlign: 'center' }}>Degraded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><span className={`badge ${r.severity === 'critical' ? 'badge-red' : 'badge-orange'}`}>{r.severity}</span></td>
                  <td>{r.oltName}</td>
                  <td className="mono">{r.boardPort}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{r.avgDelta.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{r.maxDelta.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-orange">{r.degraded}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
