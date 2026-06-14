import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oltAPI, kingtypeAPI, ontAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { IconArrowLeft, IconRefresh, IconPlus, IconSearch, IconChevronDown } from '@tabler/icons-react';

export default function KingTypeAutofind() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [profile, setProfile] = useState('LINEKTONU');
  const [selectedPort, setSelectedPort] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [authorizing, setAuthorizing] = useState(null);

  const { data: olt } = useQuery({
    queryKey: ['olt', id],
    queryFn: () => oltAPI.get(id).then(r => r.data?.data ?? r.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kingtype', id, 'autofind', selectedPort],
    queryFn: () => kingtypeAPI.autofind(id, selectedPort || undefined).then(r => r.data?.data ?? r.data),
  });

  const raw = useMemo(() => {
    if (!data) return [];
    if (selectedPort) return data.unprovisioned || [];
    const all = Array.isArray(data) ? data : [];
    return all.flatMap(p => p.unprovisioned || []);
  }, [data, selectedPort]);

  const portData = useMemo(() => {
    if (!data) return [];
    if (selectedPort) return [];
    return Array.isArray(data) ? data : [];
  }, [data, selectedPort]);

  const total = useMemo(() => {
    if (selectedPort) return data?.total || 0;
    return portData.reduce((s, p) => s + (p.total || 0), 0);
  }, [data, selectedPort, portData]);

  const provisioned = useMemo(() => {
    if (selectedPort) return data?.provisioned || 0;
    return portData.reduce((s, p) => s + (p.provisioned || 0), 0);
  }, [data, selectedPort, portData]);

  const authorizeMut = useMutation({
    mutationFn: (onu) => ontAPI.authorize({
      oltId: id, serialNumber: onu.serialNumber, port: parseInt(onu.ponPort || selectedPort || 1),
      onuId: onu.onuId, lineProfileId: profile, srvProfileId: profile,
      name: onu.description || null,
    }),
    onSuccess: () => { toast.success('Authorized'); refetch(); qc.invalidateQueries({ queryKey: ['onts'] }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Authorize failed'),
  });

  const toggleOne = (serial) => {
    setSelected(s => { const n = new Set(s); n.has(serial) ? n.delete(serial) : n.add(serial); return n; });
  };

  const authorizeSelected = async () => {
    const toAuth = raw.filter(o => selected.has(o.serialNumber));
    for (const onu of toAuth) {
      try { await authorizeMut.mutateAsync(onu); } catch {}
    }
    setSelected(new Set());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link to={`/olts/${id}/kingtype`} className="btn"><IconArrowLeft size={14} /> Back</Link>
          <span className="page-title">Autofind — {olt?.name || 'KingType'}</span>
          <span className="badge badge-blue">{total} total</span>
          <span className="badge badge-green">{provisioned} provisioned</span>
          <span className="badge" style={{ color: 'var(--orange)', borderColor: 'rgba(210,153,34,0.3)', background: 'rgba(210,153,34,0.1)' }}>{raw.length} new</span>
        </div>
        <button className="btn btn-primary" onClick={() => refetch()} disabled={isLoading}>
          <IconRefresh size={14} /> {isLoading ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      <div className="card" style={{ padding: 12, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Default Profile</label>
          <input className="input-base" style={{ width: 150 }} value={profile} onChange={e => setProfile(e.target.value)} placeholder="LINEKTONU" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>PON Port</label>
          <select className="form-control input-sm" style={{ width: 120 }}
            value={selectedPort} onChange={e => { setSelectedPort(e.target.value); setSelected(new Set()); }}>
            <option value="">All ports</option>
            {Array.from({ length: 8 }, (_, i) => i + 1).map(p => (
              <option key={p} value={String(p)}>GPON 0/{p}</option>
            ))}
          </select>
        </div>
        {selected.size > 0 && (
          <button className="btn btn-success" onClick={authorizeSelected} disabled={authorizing}>
            <IconPlus size={14} /> Authorize selected ({selected.size})
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Scanning PON ports…</div>
      ) : !selectedPort && portData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {portData.map(p => (
            <div key={p.port} className="card-sm" style={{ cursor: 'pointer' }}
              onClick={() => setSelectedPort(String(p.port))}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>GPON 0/{p.port}</span>
                <IconChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <span className="badge badge-green">{p.provisioned || 0} provisioned</span>{' '}
                <span className="badge" style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922' }}>{p.unprovisioned?.length || 0} new</span>
              </div>
            </div>
          ))}
        </div>
      ) : raw.length === 0 ? (
        <div className="card"><div className="empty-state">
          <IconSearch size={40} style={{ opacity: 0.3, marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          No unprovisioned ONUs found
        </div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input type="checkbox" className="checkbox"
                    checked={raw.length > 0 && raw.every(o => selected.has(o.serialNumber))}
                    onChange={() => {
                      if (raw.every(o => selected.has(o.serialNumber))) setSelected(new Set());
                      else setSelected(new Set(raw.map(o => o.serialNumber)));
                    }} />
                </th>
                <th style={{ width: 60 }}>ONU ID</th>
                <th>Serial</th>
                <th>PON Port</th>
                <th>Status</th>
                <th>RX (dBm)</th>
                <th>Description</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {raw.map(o => (
                <tr key={o.onuId + '-' + (o.ponPort || '1')} style={{ background: selected.has(o.serialNumber) ? 'rgba(31,111,235,0.08)' : undefined }}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" className="checkbox"
                      checked={selected.has(o.serialNumber)}
                      onChange={() => toggleOne(o.serialNumber)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{o.onuId}</td>
                  <td><span className="mono">{o.serialNumber}</span></td>
                  <td>{o.ponPort ? `GPON 0/${o.ponPort}` : '—'}</td>
                  <td><span className="badge badge-green" style={{ fontSize: 12 }}>{o.status || 'online'}</span></td>
                  <td><span className="mono" style={{ color: o.rxPower != null && o.rxPower < -25 ? 'var(--red)' : 'var(--green)' }}>{o.rxPower != null ? `${o.rxPower} dBm` : '—'}</span></td>
                  <td style={{ color: o.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>{o.description || '—'}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm" style={{ padding: '3px 10px' }}
                      onClick={() => {
                        setAuthorizing(o.onuId);
                        authorizeMut.mutate(o, { onSettled: () => setAuthorizing(null) });
                      }}
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
