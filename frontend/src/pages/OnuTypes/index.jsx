import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconDeviceDesktop, IconPlus, IconTrash, IconSearch, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { onuTypeAPI } from '../../services/api';
import ActionModal from '../../components/shared/ActionModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import toast from 'react-hot-toast';

const YesNo = ({ v }) => (v === 'Yes' || v === true || v > 0)
  ? <IconCheck size={13} style={{ color: 'var(--green)' }} />
  : <IconX size={13} style={{ color: 'var(--text-muted)' }} />;

export default function OnuTypes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['onu-types'],
    queryFn: () => onuTypeAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const types = Array.isArray(data) ? data : [];
  const filtered = useMemo(() =>
    types.filter(t => t.name?.toLowerCase().includes(search.toLowerCase())), [types, search]);

  const saveMut = useMutation({
    mutationFn: (v) => (editing?.id ? onuTypeAPI.update(editing.id, v) : onuTypeAPI.create(v)),
    onSuccess: () => { toast.success('ONU type saved'); qc.invalidateQueries({ queryKey: ['onu-types'] }); setEditing(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => onuTypeAPI.delete(id),
    onSuccess: () => { toast.success('ONU type deleted'); qc.invalidateQueries({ queryKey: ['onu-types'] }); setDeleting(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Delete failed'),
  });

  const fields = [
    { key: 'name', label: 'ONU type name', required: true, default: editing?.name },
    { key: 'ponType', label: 'PON type', type: 'select', options: ['GPON', 'EPON', 'XGSPON'], default: editing?.ponType },
    { key: 'channels', label: 'Channels', type: 'number', default: editing?.channels ?? 1 },
    { key: 'ethernetPorts', label: 'Ethernet ports', type: 'number', default: editing?.ethernetPorts },
    { key: 'wifiBands', label: 'WiFi bands', type: 'select', options: ['', '2.4G', '5G', '2.4G+5G'], default: editing?.wifiBands },
    { key: 'voipPorts', label: 'VoIP ports', type: 'number', default: editing?.voipPorts ?? 0 },
    { key: 'capability', label: 'Capability', type: 'select', options: ['HGU', 'SFU', 'MDU'], default: editing?.capability },
    { key: 'hasCATV', label: 'Has CATV', type: 'checkbox', default: editing?.hasCATV },
    { key: 'allowCustomProfiles', label: 'Allow custom profiles', type: 'checkbox', default: editing?.allowCustomProfiles },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">ONU types</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{types.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><IconPlus size={13} /> Add ONU type</button>
      </div>

      <div style={{ position: 'relative', maxWidth: 320 }}>
        <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search ONU type…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ONU types…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><IconDeviceDesktop size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />No ONU types found</div>
        ) : (
          <table className="table-base">
            <thead><tr>
              <th>PON type</th><th style={{ textAlign: 'center' }}>Channels</th><th>ONU type</th>
              <th style={{ textAlign: 'center' }}>Eth ports</th><th style={{ textAlign: 'center' }}>WiFi</th>
              <th style={{ textAlign: 'center' }}>VoIP</th><th style={{ textAlign: 'center' }}>CATV</th>
              <th style={{ textAlign: 'center' }}>Capability</th><th style={{ textAlign: 'center', width: 90 }}>Action</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td><span className="badge badge-blue">{t.ponType || 'GPON'}</span></td>
                  <td style={{ textAlign: 'center' }}>{t.channels ?? 1}</td>
                  <td><IconDeviceDesktop size={12} style={{ color: 'var(--text-muted)', verticalAlign: -1, marginRight: 6 }} />{t.name}</td>
                  <td style={{ textAlign: 'center' }}>{t.ethernetPorts ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}><YesNo v={t.wifiBands} /></td>
                  <td style={{ textAlign: 'center' }}>{t.voipPorts ?? 0}</td>
                  <td style={{ textAlign: 'center' }}><YesNo v={t.hasCATV} /></td>
                  <td style={{ textAlign: 'center' }}><span className="badge">{t.capability || 'HGU'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon" style={{ padding: 4 }} onClick={() => setEditing(t)}><IconEdit size={12} /></button>
                    <button className="btn-icon" style={{ padding: 4, color: 'var(--red)', marginLeft: 4 }} onClick={() => setDeleting(t)}><IconTrash size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionModal
        open={!!editing}
        title={editing?.id ? 'Edit ONU type' : 'Add ONU type'}
        fields={fields}
        confirmLabel={editing?.id ? 'Save' : 'Create'}
        loading={saveMut.isPending}
        onClose={() => !saveMut.isPending && setEditing(null)}
        onConfirm={(v) => saveMut.mutate(v)}
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete ONU type"
        message={`Delete ONU type "${deleting?.name}"?`}
        danger
        loading={delMut.isPending}
        confirmLabel="Delete"
        onClose={() => !delMut.isPending && setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
      />
    </div>
  );
}
