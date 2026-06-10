import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconBox, IconPlus, IconTrash, IconSearch, IconEdit, IconDownload, IconUpload } from '@tabler/icons-react';
import { odbAPI } from '../../services/api';
import ActionModal from '../../components/shared/ActionModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { downloadCSV, parseCSV, readFileText } from '../../utils/csv';
import toast from 'react-hot-toast';

export default function ODBs() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['odbs'],
    queryFn: () => odbAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const odbs = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => odbs.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) &&
    (!usageFilter || (o.usage ?? 0) >= Number(usageFilter))
  ), [odbs, search, usageFilter]);

  const saveMut = useMutation({
    mutationFn: (v) => (editing?.id ? odbAPI.update(editing.id, v) : odbAPI.create(v)),
    onSuccess: () => { toast.success('ODB saved'); qc.invalidateQueries({ queryKey: ['odbs'] }); setEditing(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => odbAPI.delete(id),
    onSuccess: () => { toast.success('ODB deleted'); qc.invalidateQueries({ queryKey: ['odbs'] }); setDeleting(null); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Delete failed'),
  });

  const importRef = React.useRef(null);
  const doExport = () => downloadCSV(odbs.map((o) => ({ name: o.name, zone: o.zone || '', ports_total: o.ports_total ?? '', ports_used: o.ports_used ?? '' })), 'odbs.csv');
  const doImport = async (file) => {
    if (!file) return;
    try {
      const rows = parseCSV(await readFileText(file));
      let ok = 0;
      for (const r of rows) { if (!r.name) continue; try { await odbAPI.create({ name: r.name, zone: r.zone, ports_total: r.ports_total ? Number(r.ports_total) : 16, ports_used: r.ports_used ? Number(r.ports_used) : 0 }); ok++; } catch {} }
      toast.success(`Imported ${ok} ODBs`); qc.invalidateQueries({ queryKey: ['odbs'] });
    } catch { toast.error('Import failed'); }
  };

  const fields = [
    { key: 'name', label: 'ODB name', required: true, default: editing?.name },
    { key: 'zone', label: 'Zone', default: editing?.zone },
    { key: 'ports_total', label: 'Number of ports', type: 'number', default: editing?.ports_total ?? 16 },
    { key: 'ports_used', label: 'Ports used', type: 'number', default: editing?.ports_used ?? 0 },
    { key: 'latitude', label: 'Latitude', type: 'number', default: editing?.latitude },
    { key: 'longitude', label: 'Longitude', type: 'number', default: editing?.longitude },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">ODBs</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{odbs.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" onClick={doExport}><IconDownload size={13} /> Export</button>
          <button className="btn" onClick={() => importRef.current?.click()}><IconUpload size={13} /> Import</button>
          <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => doImport(e.target.files[0])} />
          <button className="btn btn-primary" onClick={() => setEditing({})}><IconPlus size={13} /> Add ODB (Splitter)</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: 320, flex: '1 1 200px' }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search ODB…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-base" style={{ maxWidth: 170 }} value={usageFilter} onChange={e => setUsageFilter(e.target.value)}>
          <option value="">Usage: Any</option>
          <option value="50">≥ 50%</option><option value="75">≥ 75%</option>
          <option value="90">≥ 90%</option><option value="100">Capacity exceeded</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ODBs…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><IconBox size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />No ODBs found</div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Name</th><th style={{ textAlign: 'center' }}>Ports</th><th>Zone</th><th style={{ textAlign: 'center' }}>Usage</th><th style={{ textAlign: 'center', width: 90 }}>Action</th></tr></thead>
            <tbody>
              {filtered.slice(0, 400).map((o) => (
                <tr key={o.id}>
                  <td><IconBox size={12} style={{ color: 'var(--text-muted)', verticalAlign: -1, marginRight: 6 }} />{o.name}</td>
                  <td style={{ textAlign: 'center' }}>{o.ports_used ?? 0}/{o.ports_total ?? '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{o.zone || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${(o.usage ?? 0) >= 90 ? 'badge-red' : (o.usage ?? 0) >= 75 ? 'badge-orange' : 'badge-blue'}`}>{o.usage ?? 0}%</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon" style={{ padding: 4 }} onClick={() => setEditing(o)}><IconEdit size={12} /></button>
                    <button className="btn-icon" style={{ padding: 4, color: 'var(--red)', marginLeft: 4 }} onClick={() => setDeleting(o)}><IconTrash size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionModal
        open={!!editing}
        title={editing?.id ? 'Edit ODB' : 'Add ODB'}
        fields={fields}
        confirmLabel={editing?.id ? 'Save' : 'Create'}
        loading={saveMut.isPending}
        onClose={() => !saveMut.isPending && setEditing(null)}
        onConfirm={(v) => saveMut.mutate(v)}
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete ODB"
        message={`Delete ODB "${deleting?.name}"?`}
        danger
        loading={delMut.isPending}
        confirmLabel="Delete"
        onClose={() => !delMut.isPending && setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
      />
    </div>
  );
}
