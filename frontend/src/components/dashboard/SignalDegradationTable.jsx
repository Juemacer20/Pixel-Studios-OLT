import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI, settingsAPI } from '../../services/api';
import { IconSettings } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import SmartModal from '../shared/SmartModal';
import SmartButton from '../shared/SmartButton';

const SIGNAL_FIELDS = [
  { key: 'variationThreshold',  label: 'Signal variation threshold (dB)',      step: 0.1, parse: parseFloat },
  { key: 'largeVariationDelta', label: 'Large signal variation threshold (dB)', step: 0.1, parse: parseFloat },
  { key: 'multiOnuThreshold',   label: 'ONUs required for Unstable',            step: 1,   parse: parseInt },
  { key: 'trendWindowHours',    label: 'Repeated variation window (hours)',      step: 1,   parse: parseInt },
  { key: 'trendMinEvents',      label: 'Variations required for Critical',       step: 1,   parse: parseInt },
];

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
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['signal-thresholds'] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  return (
    <SmartModal
      open={open}
      onClose={onClose}
      title="Signal variation alert settings"
      size="sm"
      footer={
        <>
          <SmartButton variant="link" onClick={onClose}>Cancel</SmartButton>
          <SmartButton variant="primary" onClick={() => saveMut.mutate(values)} loading={saveMut.isPending}>
            Save
          </SmartButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SIGNAL_FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {f.label}
            </label>
            <input
              type="number"
              step={f.step}
              className="input-base"
              style={{ width: 120 }}
              value={values[f.key] ?? ''}
              onChange={e => setForm({ ...values, [f.key]: f.parse(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>
    </SmartModal>
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
                  <th style={{ textAlign: 'center' }}>Events</th>
                  <th>Last scan</th>
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
                    <td style={{ textAlign: 'center' }}>{r.events}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.lastScan ? new Date(r.lastScan).toLocaleString() : '—'}</td>
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
