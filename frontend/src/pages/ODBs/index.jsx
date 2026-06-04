import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconBox, IconPlus, IconTrash, IconDownload, IconUpload, IconSearch, IconEdit } from '@tabler/icons-react';
import { odbAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ODBs() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['odbs'],
    queryFn: () => odbAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const odbs = Array.isArray(data) ? data : [];
  const filtered = useMemo(() =>
    odbs.filter(o => o.name?.toLowerCase().includes(search.toLowerCase())), [odbs, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">ODBs</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{odbs.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary" onClick={() => toast('Add ODB — próximamente')}><IconPlus size={13} /> Add ODB (Splitter)</button>
          <button className="btn" onClick={() => toast('Delete unused ODBs — próximamente')}><IconTrash size={13} /> Delete unused ODBs</button>
          <button className="btn" onClick={() => toast('Export — próximamente')}><IconDownload size={13} /> Export</button>
          <button className="btn" onClick={() => toast('Import — próximamente')}><IconUpload size={13} /> Import</button>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 320 }}>
        <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-base" style={{ paddingLeft: 28 }} placeholder="Search ODB…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ODBs…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><IconBox size={32} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block' }} />No ODBs found</div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Name</th><th style={{ textAlign: 'center' }}>Nr of ports</th><th>Zone</th><th style={{ textAlign: 'right' }}>ONUs</th><th style={{ textAlign: 'center', width: 90 }}>Action</th></tr></thead>
            <tbody>
              {filtered.slice(0, 300).map((o, i) => (
                <tr key={i}>
                  <td><IconBox size={12} style={{ color: 'var(--text-muted)', verticalAlign: -1, marginRight: 6 }} />{o.name}</td>
                  <td style={{ textAlign: 'center' }}>{o.ports ?? '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{o.zone || '—'}</td>
                  <td style={{ textAlign: 'right' }}><span className="badge badge-blue">{o.onus ?? 0}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon" style={{ padding: 4 }} onClick={() => toast('Edit — próximamente')}><IconEdit size={12} /></button>
                    <button className="btn-icon" style={{ padding: 4, color: 'var(--red)', marginLeft: 4 }} onClick={() => toast('Delete — próximamente')}><IconTrash size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
