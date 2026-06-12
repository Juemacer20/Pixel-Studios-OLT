import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vsolAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  IconArrowLeft, IconRefresh, IconTrash, IconPlayerPlay, IconPlayerStop,
  IconRestore, IconPlus, IconWifi, IconWifiOff, IconSearch,
} from '@tabler/icons-react';

function StatusBadge({ status }) {
  const color = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--text-muted)' : 'var(--orange)';
  return <span className="badge" style={{ background: color + '18', color, border: '1px solid ' + color + '35', fontWeight: 600 }}>{status}</span>;
}

export default function OnuList() {
  const { id, ponIndex } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [newOnu, setNewOnu] = useState({ serial: '', onuId: 1, profile: 'default' });

  const { data: onus, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'pon', ponIndex, 'onus'],
    queryFn: () => vsolAPI.portOnus(id, ponIndex).then(r => r.data?.data ?? r.data),
    refetchInterval: 30000,
  });

  const onuList = Array.isArray(onus) ? onus : [];
  const filtered = search ? onuList.filter(o =>
    (o.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.description || '').toLowerCase().includes(search.toLowerCase())
  ) : onuList;

  const stats = {
    total: onuList.length,
    online: onuList.filter(o => o.status === 'online').length,
    offline: onuList.filter(o => o.status === 'offline').length,
  };

  const activateMut = useMutation({
    mutationFn: (onuId) => vsolAPI.activateOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('Activated'); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon'] }); },
    onError: () => toast.error('Activate failed'),
  });

  const deactivateMut = useMutation({
    mutationFn: (onuId) => vsolAPI.deactivateOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('Deactivated'); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon'] }); },
    onError: () => toast.error('Deactivate failed'),
  });

  const rebootMut = useMutation({
    mutationFn: (onuId) => vsolAPI.rebootOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('Reboot sent'); },
    onError: () => toast.error('Reboot failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (onuId) => vsolAPI.deleteOnu(id, ponIndex, onuId),
    onSuccess: () => { toast.success('ONU deleted'); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const addMut = useMutation({
    mutationFn: () => vsolAPI.addOnu(id, ponIndex, newOnu),
    onSuccess: () => { toast.success('ONU added'); setAdding(false); qc.invalidateQueries({ queryKey: ['vsol', id, 'pon'] }); },
    onError: () => toast.error('Add failed'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/olts/${id}/vsol`} className="btn"><IconArrowLeft size={14} /> Back</Link>
          <span className="page-title">GPON 0/{ponIndex}</span>
          <span className="badge badge-blue">{stats.total} ONUs</span>
          <span className="badge badge-green">{stats.online} online</span>
          <span className="badge badge-gray">{stats.offline} offline</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh</button>
          <button className="btn btn-success" onClick={() => setAdding(!adding)}><IconPlus size={14} /> Add ONU</button>
        </div>
      </div>

      {/* ── Add ONU form ── */}
      {adding && (
        <div className="card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Serial number</label><input className="input-base" placeholder="VSOLXXXXXXXX" style={{ width: 200 }} value={newOnu.serial} onChange={e => setNewOnu({...newOnu, serial: e.target.value})} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ONU ID</label><input className="input-base" type="number" min={1} style={{ width: 80 }} value={newOnu.onuId} onChange={e => setNewOnu({...newOnu, onuId: parseInt(e.target.value) || 1})} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Profile</label><input className="input-base" placeholder="default" style={{ width: 130 }} value={newOnu.profile} onChange={e => setNewOnu({...newOnu, profile: e.target.value})} /></div>
          <button className="btn btn-success" onClick={() => addMut.mutate()} disabled={!newOnu.serial || addMut.isPending}
            style={{ marginBottom: 1 }}>{addMut.isPending ? 'Adding…' : 'Add'}</button>
          <button className="btn" onClick={() => setAdding(false)} style={{ marginBottom: 1 }}>Cancel</button>
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconSearch size={14} style={{ color: 'var(--text-muted)' }} />
        <input className="input-base" style={{ maxWidth: 300 }} placeholder="Search by serial or description…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="btn" onClick={() => setSearch('')}>Clear</button>}
      </div>

      {/* ── ONU table ── */}
      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ONUs…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No ONUs found {search ? 'matching your search' : `on GPON 0/${ponIndex}`}</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Serial</th>
                <th>Description</th>
                <th style={{ width: 80 }}>Status</th>
                <th style={{ width: 70 }}>Admin</th>
                <th style={{ width: 70 }}>OMCC</th>
                <th style={{ width: 70 }}>Phase</th>
                <th style={{ width: 70 }}>Config</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const isOnline = o.status === 'online';
                return (
                  <tr key={o.onuId}>
                    <td style={{ fontWeight: 600 }}>
                      <Link to={`/olts/${id}/vsol/onu/${ponIndex}/${o.onuId}`} style={{ color: 'var(--accent)' }}>{o.onuId}</Link>
                    </td>
                    <td><span className="mono">{o.serialNumber}</span></td>
                    <td style={{ color: o.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {o.description || '—'}
                    </td>
                    <td>
                      <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} style={{ width: 10, height: 10, marginRight: 4, verticalAlign: 'middle' }} />
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={{ fontSize: 12 }}>{o.adminState}</td>
                    <td style={{ fontSize: 12 }}>{o.omccState}</td>
                    <td style={{ fontSize: 12 }}>{o.phaseState}</td>
                    <td style={{ fontSize: 12 }}>{o.configState}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button className="sol-act teal" title="Activate" onClick={() => activateMut.mutate(o.onuId)}><IconPlayerPlay size={12} /></button>
                        <button className="sol-act amber" title="Deactivate" onClick={() => deactivateMut.mutate(o.onuId)}><IconPlayerStop size={12} /></button>
                        <button className="sol-act" title="Reboot" onClick={() => rebootMut.mutate(o.onuId)}><IconRestore size={12} /></button>
                        <button className="sol-act red" title="Delete" onClick={() => { if (confirm(`Delete ONU ${o.onuId} (${o.serialNumber})?`)) deleteMut.mutate(o.onuId); }}><IconTrash size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
