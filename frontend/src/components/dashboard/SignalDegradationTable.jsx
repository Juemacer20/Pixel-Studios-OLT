import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI, settingsAPI } from '../../services/api';
import { IconSettings } from '@tabler/icons-react';
import toast from 'react-hot-toast';

function SignalVariationModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ['signal-thresholds'],
    queryFn: () => settingsAPI.signalThresholds().then(r => r.data?.data ?? r.data),
    enabled: open,
  });
  const [form, setForm] = useState(null);
  const values = form ?? cfg ?? {};
  React.useEffect(() => { if (cfg && !form) setForm(cfg); }, [cfg, form]);

  const saveMut = useMutation({
    mutationFn: (d) => settingsAPI.saveSignalThresholds(d),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['signal-thresholds'] }); onClose(); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>Signal variation alert settings</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label>Signal variation threshold (dB)</label>
                  <input type="number" step={0.1} className="form-control input-sm" style={{ width: 120 }}
                    value={values.variationThreshold ?? ''}
                    onChange={e => setForm({ ...values, variationThreshold: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Large signal variation threshold (dB)</label>
                  <input type="number" step={0.1} className="form-control input-sm" style={{ width: 120 }}
                    value={values.largeVariationDelta ?? ''}
                    onChange={e => setForm({ ...values, largeVariationDelta: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>ONUs required for Unstable</label>
                  <input type="number" className="form-control input-sm" style={{ width: 120 }}
                    value={values.multiOnuThreshold ?? ''}
                    onChange={e => setForm({ ...values, multiOnuThreshold: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Repeated variation window (hours)</label>
                  <input type="number" className="form-control input-sm" style={{ width: 120 }}
                    value={values.trendWindowHours ?? ''}
                    onChange={e => setForm({ ...values, trendWindowHours: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Variations required for Critical</label>
                  <input type="number" className="form-control input-sm" style={{ width: 120 }}
                    value={values.trendMinEvents ?? ''}
                    onChange={e => setForm({ ...values, trendMinEvents: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-link" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveMut.mutate(values)} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SignalDegradationTable() {
  const [showSettings, setShowSettings] = useState(false);
  const { data } = useQuery({
    queryKey: ['dashboard', 'signal-degradation'],
    queryFn: () => dashboardAPI.signalDegradation().then((r) => r.data?.data ?? { rows: [] }),
    refetchInterval: 60000,
  });
  const rows = data?.rows || [];

  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h">
          <span>📉 Signal degradation</span>
          <a href="#" className="more" onClick={e => { e.preventDefault(); setShowSettings(true); }}
            style={{ fontSize: 13, cursor: 'pointer' }} title="Signal variation settings">
            <IconSettings size={13} />
          </a>
        </div>
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
      <SignalVariationModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
