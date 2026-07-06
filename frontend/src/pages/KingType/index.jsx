import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { oltAPI, kingtypeAPI } from '../../services/api';
import {
  IconSettings, IconSearch, IconPlayerPlay,
  IconFileText, IconArrowLeft, IconRefresh, IconServer,
} from '@tabler/icons-react';

export default function KingTypeDashboard() {
  const { id } = useParams();

  const { data: olt } = useQuery({
    queryKey: ['olt', id],
    queryFn: () => oltAPI.get(id).then(r => r.data?.data ?? r.data),
  });

  const { data: portsData, isLoading, refetch } = useQuery({
    queryKey: ['kingtype', id, 'ports'],
    queryFn: () => kingtypeAPI.ports(id).then(r => r.data?.data ?? r.data),
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
          <span className="page-title">{olt?.name || 'KingType OLT'}</span>
          <span className="badge badge-blue" style={{ fontSize: 13, padding: '3px 10px' }}>KingType</span>
        </div>
        <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh</button>
      </div>

      <div className="sol-stats">
        <div className="sol-statbox sol-s-blue">
          <IconServer size={30} className="ico" />
          <div className="num">{ports.length}</div>
          <div className="lbl">PON Ports</div>
          <div className="foot"><span>GPON 0/1 – 0/{ports.length || 1}</span></div>
        </div>
        <div className="sol-statbox sol-s-green">
          <div className="num">{totalOnus}</div>
          <div className="lbl">Total ONUs</div>
          <div className="foot"><span style={{ color: '#5cb85c' }}>{totalOnline} online</span> · <span style={{ color: '#d9534f' }}>{totalOffline} offline</span></div>
        </div>
        <div className="sol-statbox sol-s-orange">
          <div className="num">{ports.filter(p => p.offline > 0).length}</div>
          <div className="lbl">Ports with offline</div>
          <div className="foot"><span>Review required</span></div>
        </div>
      </div>

      {/* ── PON Ports table ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span><IconServer size={14} /> PON Ports</span>
          <Link to={`/kingtype/${id}/autofind`} className="more"><IconSearch size={12} /> Autofind</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          ) : ports.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 13 }}>No PON ports found</div>
          ) : (
            <table className="table-base">
              <tr>
                <th>Port</th><th>Total ONUs</th><th>Online</th><th>Offline</th><th />
              </tr>
              <tbody>
                {ports.map(p => (
                  <tr key={p.port} className="valign-center">
                    <td><strong>GPON 0/{p.port}</strong></td>
                    <td>{p.total}</td>
                    <td style={{ color: '#5cb85c' }}>{p.online}</td>
                    <td style={{ color: p.offline > 0 ? '#d9534f' : 'inherit' }}>{p.offline}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/kingtype/${id}/pon/${p.port}`} className="btn btn-sm btn-primary" style={{ fontSize: 11.5 }}>
                        <IconSettings size={12} /> Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to={`/kingtype/${id}/autofind`} className="btn" style={{ flex: 1, textAlign: 'center', padding: '12px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <IconSearch size={16} /> Autofind ONUs
        </Link>
        <Link to={`/kingtype/${id}/config`} className="btn" style={{ flex: 1, textAlign: 'center', padding: '12px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <IconFileText size={16} /> Running Config
        </Link>
        <Link to={`/kingtype/${id}/profiles`} className="btn" style={{ flex: 1, textAlign: 'center', padding: '12px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <IconPlayerPlay size={16} /> Profiles
        </Link>
      </div>
    </div>
  );
}
