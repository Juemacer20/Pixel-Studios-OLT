import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vsolAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  IconArrowLeft, IconRefresh, IconPlayerPlay, IconPlayerStop,
  IconRestore, IconWifi, IconActivity, IconRuler2,
  IconSettings, IconList,
} from '@tabler/icons-react';

const TABS = [
  { key: 'optical', label: 'Optical', Icon: IconWifi },
  { key: 'stats', label: 'Statistics', Icon: IconActivity },
  { key: 'eth', label: 'Ethernet', Icon: IconList },
  { key: 'distance', label: 'Distance', Icon: IconRuler2 },
  { key: 'profile', label: 'Profile', Icon: IconSettings },
];

function Tab({ tab, active, onClick }) {
  return (
    <button
      className={`tab-item${active ? ' tab-active' : ''}`}
      onClick={onClick}
    ><tab.Icon size={13} style={{ marginRight: 5 }} />{tab.label}</button>
  );
}

export default function OnuView() {
  const { id, ponIndex, onuId } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('optical');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'pon', ponIndex, 'onu', onuId],
    queryFn: () => vsolAPI.onuDetail(id, ponIndex, onuId).then(r => r.data?.data ?? r.data),
    refetchInterval: 60000,
  });

  const activateMut = useMutation({
    mutationFn: () => vsolAPI.activateOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('ONU activated'); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon', ponIndex, 'onu', onuId] }); },
    onError: () => toast.error('Activate failed'),
  });

  const deactivateMut = useMutation({
    mutationFn: () => vsolAPI.deactivateOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('ONU deactivated'); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon', ponIndex, 'onu', onuId] }); },
    onError: () => toast.error('Deactivate failed'),
  });

  const rebootMut = useMutation({
    mutationFn: () => vsolAPI.rebootOnu(id, ponIndex, onuId),
    onSuccess: () => toast.success('Reboot sent'),
    onError: () => toast.error('Reboot failed'),
  });

  const renderOptical = () => {
    const o = data?.optical || {};
    if (!o.rxPower && !o.txPower) return <div className="empty-state">No optical data available for this ONU</div>;
    const signalClass = o.rxPower < -25 ? 'signal-critical' : o.rxPower < -20 ? 'signal-warn' : 'signal-optimal';
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Rx Power</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace' }} className={signalClass}>{o.rxPower} <span style={{ fontSize: 14, fontWeight: 400 }}>dBm</span></div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tx Power</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace' }}>{o.txPower || '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>dBm</span></div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>OLT Rx</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>{o.oltRxPower || '—'} <span style={{ fontSize: 12, fontWeight: 400 }}>dBm</span></div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Temperature</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>{o.temperature || '—'} <span style={{ fontSize: 12, fontWeight: 400 }}>°C</span></div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Voltage</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>{o.voltage || '—'} <span style={{ fontSize: 12, fontWeight: 400 }}>V</span></div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bias Current</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>{o.biasCurrent || '—'} <span style={{ fontSize: 12, fontWeight: 400 }}>mA</span></div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const s = data?.stats || {};
    const entries = Object.entries(s);
    if (!entries.length) return <div className="empty-state">No statistics data</div>;
    return (
      <table className="data-table">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 280, padding: '6px 12px' }}>{k}</td>
              <td style={{ fontFamily: 'monospace', padding: '6px 12px' }}>{v ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderEth = () => {
    const ports = data?.ethPorts || [];
    if (!ports.length) return <div className="empty-state">No Ethernet port data</div>;
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Port</th>
            <th>Link</th>
            <th>Speed</th>
            <th>Duplex</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((p, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>ETH {p.portIndex || i + 1}</td>
              <td>
                <span className={`status-dot ${p.linkStatus === 'up' ? 'status-online' : 'status-offline'}`} style={{ width: 8, height: 8, marginRight: 5, verticalAlign: 'middle' }} />
                <span style={{ color: p.linkStatus === 'up' ? 'var(--green)' : 'var(--text-muted)' }}>{p.linkStatus || 'down'}</span>
              </td>
              <td className="mono">{p.speed || '—'}</td>
              <td>{p.duplex || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderDistance = () => {
    const d = data?.distance;
    if (!d) return <div className="empty-state">No distance data</div>;
    return (
      <table className="data-table">
        <tbody>
          {Object.entries(d).map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 200, padding: '6px 12px' }}>{k}</td>
              <td style={{ fontFamily: 'monospace', padding: '6px 12px' }}>{v != null ? `${v} m` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderProfile = () => {
    const p = data?.profile || {};
    const entries = Object.entries(p);
    if (!entries.length) return <div className="empty-state">No profile data</div>;
    return (
      <table className="data-table">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: 200, padding: '6px 12px' }}>{k}</td>
              <td style={{ padding: '6px 12px' }}>{v != null ? String(v) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderContent = {
    optical: renderOptical,
    stats: renderStats,
    eth: renderEth,
    distance: renderDistance,
    profile: renderProfile,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/olts/${id}/vsol/pon/${ponIndex}`} className="btn"><IconArrowLeft size={14} /> Back to PON</Link>
          <span className="page-title">ONU {onuId} <span className="badge badge-blue">GPON 0/{ponIndex}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh</button>
          <button className="sol-act teal" title="Activate" onClick={() => activateMut.mutate()}><IconPlayerPlay size={13} /></button>
          <button className="sol-act amber" title="Deactivate" onClick={() => deactivateMut.mutate()}><IconPlayerStop size={13} /></button>
          <button className="sol-act" title="Reboot" onClick={() => rebootMut.mutate()}><IconRestore size={13} /></button>
        </div>
      </div>

      {/* ── Detail card ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tab-bar">
          {TABS.map(t => (
            <Tab key={t.key} tab={t} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </div>
        <div style={{ padding: 16, minHeight: 150 }}>
          {isLoading ? (
            <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ONU data…</div>
          ) : (
            (renderContent[tab] || renderOptical)()
          )}
        </div>
      </div>
    </div>
  );
}
