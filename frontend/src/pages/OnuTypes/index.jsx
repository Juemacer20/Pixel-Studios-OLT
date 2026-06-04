import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconDeviceDesktop, IconPlus, IconTrash, IconSearch, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { onuTypeAPI } from '../../services/api';
import toast from 'react-hot-toast';

const YesNo = ({ v }) => (v === 'Yes' || v === true || v > 0)
  ? <IconCheck size={13} style={{ color: 'var(--green)' }} />
  : <IconX size={13} style={{ color: 'var(--text-muted)' }} />;

export default function OnuTypes() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['onu-types'],
    queryFn: () => onuTypeAPI.list().then(r => r.data?.data ?? r.data).catch(() => []),
    retry: 1,
  });
  const types = Array.isArray(data) ? data : [];
  const filtered = useMemo(() =>
    types.filter(t => t.name?.toLowerCase().includes(search.toLowerCase())), [types, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">ONU types</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{types.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => toast('Add ONU type — próximamente')}><IconPlus size={13} /> Add ONU type</button>
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
              <th style={{ textAlign: 'center' }}>Ethernet ports</th><th style={{ textAlign: 'center' }}>WiFi</th>
              <th style={{ textAlign: 'center' }}>VoIP ports</th><th style={{ textAlign: 'center' }}>CATV</th>
              <th style={{ textAlign: 'right' }}>ONUs</th><th style={{ textAlign: 'center', width: 90 }}>Action</th>
            </tr></thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i}>
                  <td><span className="badge badge-blue">{t.pon_type || 'GPON'}</span></td>
                  <td style={{ textAlign: 'center' }}>{t.channels ?? 1}</td>
                  <td><IconDeviceDesktop size={12} style={{ color: 'var(--text-muted)', verticalAlign: -1, marginRight: 6 }} />{t.name}</td>
                  <td style={{ textAlign: 'center' }}>{t.ethernet_ports ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}><YesNo v={t.wifi} /></td>
                  <td style={{ textAlign: 'center' }}>{t.voip_ports ?? 0}</td>
                  <td style={{ textAlign: 'center' }}><YesNo v={t.catv} /></td>
                  <td style={{ textAlign: 'right' }}><span className="badge badge-gray">{t.onus ?? 0}</span></td>
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
