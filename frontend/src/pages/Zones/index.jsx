import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconMapPin, IconPlus, IconTrash, IconSearch, IconEdit } from '@tabler/icons-react';
import { zoneAPI } from '../../services/api';
import ActionModal from '../../components/shared/ActionModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import toast from 'react-hot-toast';

export default function Zones() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => zoneAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const zones = Array.isArray(data) ? data : [];
  const filtered = useMemo(() =>
    zones.filter(z => z.name?.toLowerCase().includes(search.toLowerCase())), [zones, search]);

  const saveMut = useMutation({
    mutationFn: (v) => (editing?.id ? zoneAPI.update(editing.id, v) : zoneAPI.create(v)),
    onSuccess: () => { toast.success('Zone saved'); qc.invalidateQueries({ queryKey: ['zones'] }); setEditing(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => zoneAPI.delete(id),
    onSuccess: () => { toast.success('Zone deleted'); qc.invalidateQueries({ queryKey: ['zones'] }); setDeleting(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Delete failed'),
  });

  const fields = [
    { key: 'name', label: 'Zone name', required: true, default: editing?.name },
    { key: 'description', label: 'Description', default: editing?.description },
    { key: 'latitude', label: 'Latitude', type: 'number', default: editing?.latitude },
    { key: 'longitude', label: 'Longitude', type: 'number', default: editing?.longitude },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">Zones</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{zones.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><IconPlus size={13} /> Add Zone</button>
      </div>

      <div style={{ position: 'relative', maxWidth: 320 }}>
        <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search zone…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading zones…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><IconMapPin size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />No zones found</div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Name</th><th style={{ textAlign: 'right' }}>ONUs</th><th style={{ textAlign: 'center', width: 90 }}>Action</th></tr></thead>
            <tbody>
              {filtered.map((z) => (
                <tr key={z.id}>
                  <td><IconMapPin size={12} style={{ color: 'var(--text-muted)', verticalAlign: -1, marginRight: 6 }} />{z.name}</td>
                  <td style={{ textAlign: 'right' }}><span className="badge badge-blue">{z.ont_count ?? z.onus ?? 0}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon" style={{ padding: 4 }} onClick={() => setEditing(z)}><IconEdit size={12} /></button>
                    <button className="btn-icon" style={{ padding: 4, color: 'var(--red)', marginLeft: 4 }} onClick={() => setDeleting(z)}><IconTrash size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionModal
        open={!!editing}
        title={editing?.id ? 'Edit zone' : 'Add zone'}
        fields={fields}
        confirmLabel={editing?.id ? 'Save' : 'Create'}
        loading={saveMut.isPending}
        onClose={() => !saveMut.isPending && setEditing(null)}
        onConfirm={(v) => saveMut.mutate(v)}
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete zone"
        message={`Delete zone "${deleting?.name}"?`}
        danger
        loading={delMut.isPending}
        confirmLabel="Delete"
        onClose={() => !delMut.isPending && setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
      />
    </div>
  );
}
