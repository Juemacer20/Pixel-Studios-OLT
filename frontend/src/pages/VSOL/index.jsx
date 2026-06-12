import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { oltAPI, vsolAPI } from '../../services/api';
import {
  IconPlugConnected, IconWifi, IconWifiOff,
  IconSettings, IconSearch, IconPlayerPlay,
  IconFileText, IconArrowLeft, IconRefresh, IconServer,
} from '@tabler/icons-react';

export default function VSOLDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: olt } = useQuery({
    queryKey: ['olt', id],
    queryFn: () => oltAPI.get(id).then(r => r.data?.data ?? r.data),
  });

  const { data: portsData, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'ports'],
    queryFn: () => vsolAPI.ports(id).then(r => r.data?.data ?? r.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const ports = Array.isArray(portsData) ? portsData : [];
  const totalOnus = ports.reduce((s, p) => s + p.total, 0);
  const totalOnline = ports.reduce((s, p) => s + p.online, 0);
  const totalOffline = totalOnus - totalOnline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/olts" className="btn"><IconArrowLeft size={14} /> Back to OLTs</Link>
          <span className="page-title">{olt?.name || 'VSOL OLT'}</span>
          <span className="badge badge-blue" style={{ fontSize: 13, padding: '3px 10px' }}>VSOL V2801</span>
        </div>
        <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh</button>
      </div>

      {/* ── Stat boxes SmartOLT-style ── */}
      <div className="sol-stats">
        <div className="sol-statbox sol-s-blue">
          <IconServer size={30} className="ico" />
          <div className="num">{ports.length}</div>
          <div className="lbl">PON Ports</div>
          <div className="foot"><span>GPON 0/1 – 0/{ports.length || 1}</span></div>
        </div>
        <div className="sol-statbox sol-s-green">
          <IconWifi size={30} className="ico" />
          <div className="num">{totalOnline}</div>
          <div className="lbl">ONUs Online</div>
          <div className="foot"><span>{totalOnus ? Math.round(totalOnline / totalOnus * 100) : 0}% online</span></div>
        </div>
        <div className="sol-statbox sol-s-slate">
          <IconWifiOff size={30} className="ico" />
          <div className="num">{totalOffline}</div>
          <div className="lbl">Offline</div>
          <div className="foot"><span>{totalOnus ? Math.round(totalOffline / totalOnus * 100) : 0}% offline</span></div>
        </div>
        <div className="sol-statbox sol-s-orange">
          <IconServer size={30} className="ico" />
          <div className="num">{totalOnus}</div>
          <div className="lbl">Total ONUs</div>
          <div className="foot"><span>{ports.length} PON ports</span></div>
        </div>
      </div>

      {/* ── PON Ports grid ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span><IconPlugConnected size={15} /> PON Ports</span><span className="more" onClick={() => refetch()}>Refresh</span></div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {isLoading ? (
            <div className="empty-state" style={{ padding: 20 }}><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ports…</div>
          ) : ports.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>No PON ports found</div>
          ) : ports.map(p => (
            <Link
              key={p.port}
              to={`/olts/${id}/vsol/pon/${p.port}`}
              className="card-sm"
              style={{ textDecoration: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>GPON 0/{p.port}</span>
                <span className="badge" style={{ fontSize: 12, padding: '2px 8px' }}>{p.total} ONUs</span>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span><span className="status-dot status-online" style={{ width: 8, height: 8, marginRight: 4 }} />{p.online} online</span>
                <span><span className="status-dot status-offline" style={{ width: 8, height: 8, marginRight: 4 }} />{p.offline} offline</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {p.online > 0 ? `${Math.round(p.online / p.total * 100)}% uptime` : 'No active ONUs'}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span><IconFileText size={15} /> Quick actions</span></div>
        <div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/olts/${id}/vsol/profiles`} className="btn" style={{ gap: 6 }}><IconSettings size={14} /> Profiles</Link>
          <Link to={`/olts/${id}/vsol/autofind`} className="btn" style={{ gap: 6 }}><IconSearch size={14} /> Autofind</Link>
          <Link to={`/olts/${id}/vsol/batch`} className="btn" style={{ gap: 6 }}><IconPlayerPlay size={14} /> Batch</Link>
          <Link to={`/olts/${id}/config`} className="btn" style={{ gap: 6 }}><IconFileText size={14} /> OLT Config</Link>
        </div>
      </div>
    </div>
  );
}
