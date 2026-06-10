import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconWand, IconPlus, IconSearch, IconCircleCheck, IconTrash, IconEdit } from '@tabler/icons-react';
import { authPresetAPI, oltAPI, onuTypeAPI, zoneAPI, odbAPI, speedProfileAPI } from '../../services/api';
import ActionModal from '../../components/shared/ActionModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import toast from 'react-hot-toast';

const arr = (r) => r?.data?.data ?? r?.data ?? [];
const HELP = [
  { n: 1, title: 'Create Preset', desc: 'Set up conditions and ONU settings' },
  { n: 2, title: 'Set Conditions', desc: 'Define when to apply this preset' },
  { n: 3, title: 'Enable Auto-Auth', desc: 'Turn on auto-authorization' },
  { n: 4, title: 'Done', desc: 'ONUs will be authorized automatically' },
];

export default function AuthPresets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // preset object or {} for new
  const [deleting, setDeleting] = useState(null);

  const { data } = useQuery({ queryKey: ['auth-presets'], queryFn: () => authPresetAPI.list().then(arr).catch(() => []), retry: 1 });
  const { data: olts } = useQuery({ queryKey: ['olts-list'], queryFn: () => oltAPI.list().then(arr) });
  const { data: onuTypes } = useQuery({ queryKey: ['onu-types'], queryFn: () => onuTypeAPI.list().then(arr) });
  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: () => zoneAPI.list().then(arr) });
  const { data: odbs } = useQuery({ queryKey: ['odbs'], queryFn: () => odbAPI.list().then(arr) });
  const { data: profiles } = useQuery({ queryKey: ['speed-profiles'], queryFn: () => speedProfileAPI.list().then(arr) });

  const presets = (Array.isArray(data) ? data : []).filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  const saveMut = useMutation({
    mutationFn: (v) => (editing?.id ? authPresetAPI.update(editing.id, v) : authPresetAPI.create(v)),
    onSuccess: () => { toast.success('Preset saved'); qc.invalidateQueries({ queryKey: ['auth-presets'] }); setEditing(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => authPresetAPI.delete(id),
    onSuccess: () => { toast.success('Preset deleted'); qc.invalidateQueries({ queryKey: ['auth-presets'] }); setDeleting(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Delete failed'),
  });

  const oltOpts = (olts || []).map((o) => ({ value: o.id, label: o.name }));
  const typeOpts = (onuTypes || []).map((t) => ({ value: t.id, label: t.name }));
  const zoneOpts = (zones || []).map((z) => ({ value: z.id, label: z.name }));
  const odbOpts = (odbs || []).map((o) => ({ value: o.id, label: o.name }));
  const spOpts = (profiles || []).map((p) => ({ value: p.id, label: `${p.name} (${p.type})` }));

  const fields = [
    { key: 'name', label: 'Preset name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'oltId', label: 'OLT', type: 'select', options: oltOpts },
    { key: 'ponType', label: 'PON type', type: 'select', options: ['GPON', 'EPON', 'XGSPON'] },
    { key: 'snPattern', label: 'SN pattern (regex)', help: 'Match ONUs by serial, e.g. ^HWTC' },
    { key: 'onuTypeId', label: 'ONU type', type: 'select', options: typeOpts },
    { key: 'fallbackOnuTypeId', label: 'Fallback ONU type', type: 'select', options: typeOpts },
    { key: 'mode', label: 'Mode', type: 'select', options: ['Bridge', 'Router'] },
    { key: 'svlanId', label: 'S-VLAN', type: 'number' },
    { key: 'cvlanId', label: 'C-VLAN', type: 'number' },
    { key: 'tagTransform', label: 'Tag-transform', type: 'select', options: ['translate', 'default', 'transparent'] },
    { key: 'downloadSpeedId', label: 'Download profile', type: 'select', options: spOpts },
    { key: 'uploadSpeedId', label: 'Upload profile', type: 'select', options: spOpts },
    { key: 'zoneId', label: 'Zone', type: 'select', options: zoneOpts },
    { key: 'odbId', label: 'ODB', type: 'select', options: odbOpts },
    { key: 'isActive', label: 'Active (enable auto-auth)', type: 'checkbox', default: true },
  ];
  const fieldsWithDefaults = fields.map((f) => editing && editing[f.key] !== undefined ? { ...f, default: editing[f.key] } : f);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ marginBottom: 0 }}><span className="page-title">Authorization Presets</span></div>

      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span>ℹ How it works</span></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {HELP.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: 'rgba(43,127,212,.18)',
                color: '#7fb6ec', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={() => setEditing({})}><IconWand size={13} /> Create Preset</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {presets.length === 0 ? (
          <div className="empty-state">
            <IconCircleCheck size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />
            <div>No presets found</div>
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Create your first authorization preset</div>
          </div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Name</th><th>PON</th><th>SN pattern</th><th>Mode</th><th>Active</th><th style={{ width: 90 }}>Action</th></tr></thead>
            <tbody>{presets.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.ponType || '—'}</td><td className="mono" style={{ fontSize: 11 }}>{p.snPattern || '—'}</td>
                <td>{p.mode || '—'}</td><td>{p.isActive ? <span className="badge badge-green">Yes</span> : <span className="badge">No</span>}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon" onClick={() => setEditing(p)} aria-label="Edit"><IconEdit size={14} /></button>
                  <button className="btn-icon" onClick={() => setDeleting(p)} aria-label="Delete"><IconTrash size={14} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <ActionModal
        open={!!editing}
        title={editing?.id ? 'Edit preset' : 'Create authorization preset'}
        fields={fieldsWithDefaults}
        confirmLabel={editing?.id ? 'Save' : 'Create'}
        loading={saveMut.isPending}
        onClose={() => !saveMut.isPending && setEditing(null)}
        onConfirm={(v) => saveMut.mutate(v)}
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete preset"
        message={`Delete preset "${deleting?.name}"?`}
        danger
        loading={delMut.isPending}
        confirmLabel="Delete"
        onClose={() => !delMut.isPending && setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
      />
    </div>
  );
}
