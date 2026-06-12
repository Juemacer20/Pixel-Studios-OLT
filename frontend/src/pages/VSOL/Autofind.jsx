import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { vsolAPI, ontAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { IconArrowLeft, IconRefresh, IconPlus, IconSearch } from '@tabler/icons-react';

export default function Autofind() {
  const { id } = useParams();
  const [profile, setProfile] = useState('default');
  const [port, setPort] = useState(1);
  const [authorizing, setAuthorizing] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'autofind'],
    queryFn: () => vsolAPI.autofind(id).then(r => r.data?.data ?? r.data),
  });

  const unprovisioned = data?.unprovisioned || [];
  const total = data?.total || 0;
  const provisioned = data?.provisioned || 0;

  const authorizeMut = useMutation({
    mutationFn: (onu) => ontAPI.authorize({
      oltId: id, serialNumber: onu.serialNumber, port: parseInt(port),
      onuId: onu.onuId, lineProfileId: profile, srvProfileId: profile,
      name: onu.description || null,
    }),
    onSuccess: () => { toast.success('Authorized'); refetch(); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Authorize failed'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/olts/${id}/vsol`} className="btn"><IconArrowLeft size={14} /> Back</Link>
          <span className="page-title">Autofind</span>
          <span className="badge badge-blue">{total} total</span>
          <span className="badge badge-green">{provisioned} provisioned</span>
          <span className="badge" style={{ color: 'var(--orange)', borderColor: 'rgba(210,153,34,0.3)', background: 'rgba(210,153,34,0.1)' }}>{unprovisioned.length} new</span>
        </div>
        <button className="btn btn-primary" onClick={() => refetch()} disabled={isLoading}>
          <IconRefresh size={14} /> {isLoading ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      <div className="card" style={{ padding: 12, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Default Profile</label>
          <input className="input-base" style={{ width: 150 }} value={profile} onChange={e => setProfile(e.target.value)} placeholder="default" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>PON Port</label>
          <input className="input-base" type="number" min={1} max={8} style={{ width: 70 }} value={port} onChange={e => setPort(parseInt(e.target.value) || 1)} />
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Scanning PON ports…</div>
      ) : unprovisioned.length === 0 ? (
        <div className="card"><div className="empty-state">
          <IconSearch size={40} style={{ opacity: 0.3, marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          No unprovisioned ONUs found — all discovered ONUs are already in the database.
        </div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ONU ID</th>
                <th>Serial</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unprovisioned.map(o => (
                <tr key={o.onuId}>
                  <td style={{ fontWeight: 600 }}>{o.onuId}</td>
                  <td><span className="mono">{o.serialNumber}</span></td>
                  <td><span className="badge badge-green" style={{ fontSize: 12 }}>{o.status}</span></td>
                  <td style={{ color: o.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>{o.description || '—'}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm" style={{ padding: '3px 10px' }}
                      onClick={() => authorizeMut.mutate(o)}
                      disabled={authorizing === o.onuId}
                    ><IconPlus size={12} /> Authorize</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
