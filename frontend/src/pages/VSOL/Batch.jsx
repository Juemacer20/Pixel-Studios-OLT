import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { vsolAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  IconArrowLeft, IconPlayerPlay, IconPlayerStop, IconRestore,
  IconRefresh, IconCheck, IconX,
} from '@tabler/icons-react';

export default function Batch() {
  const { id } = useParams();
  const [ponIndex, setPonIndex] = useState(1);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);

  const { data: onus, isLoading, refetch } = useQuery({
    queryKey: ['vsol', id, 'pon', ponIndex, 'onus'],
    queryFn: () => vsolAPI.portOnus(id, ponIndex).then(r => r.data?.data ?? r.data),
  });

  const onuList = Array.isArray(onus) ? onus : [];

  const toggle = (onuId) => setSelected(prev => prev.includes(onuId) ? prev.filter(x => x !== onuId) : [...prev, onuId]);
  const selectAll = () => setSelected(selected.length === onuList.length ? [] : onuList.map(o => o.onuId));

  const batchMut = useMutation({
    mutationFn: ({ action }) => vsolAPI.batch(id, action, { ponIndex, onuIds: selected }),
    onSuccess: (r) => {
      const d = r.data?.data ?? r.data;
      setResults(d);
      toast.success(`${d.success} succeeded, ${d.fail} failed`);
    },
    onError: () => toast.error('Batch operation failed'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/olts/${id}/vsol`} className="btn"><IconArrowLeft size={14} /> Back</Link>
          <span className="page-title">Batch Operations</span>
          {selected.length > 0 && <span className="badge badge-blue">{selected.length} selected</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>PON Port</label>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
              <button
                key={p}
                className={`btn btn-sm ${ponIndex === p ? 'btn-primary' : ''}`}
                onClick={() => { setPonIndex(p); setSelected([]); setResults(null); }}
                style={{ minWidth: 32, justifyContent: 'center' }}
              >{p}</button>
            ))}
          </div>
        </div>
        <button className="btn" onClick={() => refetch()}><IconRefresh size={14} /> Refresh</button>
      </div>

      {isLoading ? (
        <div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ONUs…</div>
      ) : onuList.length === 0 ? (
        <div className="empty-state">No ONUs on GPON 0/{ponIndex}</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" className="checkbox" onChange={selectAll} checked={selected.length === onuList.length && onuList.length > 0} /></th>
                <th style={{ width: 50 }}>ID</th>
                <th>Serial</th>
                <th style={{ width: 80 }}>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {onuList.map(o => (
                <tr
                  key={o.onuId}
                  style={{ background: selected.includes(o.onuId) ? 'rgba(31,111,235,0.08)' : undefined }}
                >
                  <td><input type="checkbox" className="checkbox" checked={selected.includes(o.onuId)} onChange={() => toggle(o.onuId)} /></td>
                  <td style={{ fontWeight: 600 }}>{o.onuId}</td>
                  <td><span className="mono">{o.serialNumber}</span></td>
                  <td>
                    <span className={`status-dot ${o.status === 'online' ? 'status-online' : 'status-offline'}`} style={{ width: 8, height: 8, marginRight: 4, verticalAlign: 'middle' }} />
                    <span style={{ color: o.status === 'online' ? 'var(--green)' : 'var(--text-muted)' }}>{o.status}</span>
                  </td>
                  <td style={{ color: o.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>{o.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="btn btn-success"
          disabled={!selected.length || batchMut.isPending}
          onClick={() => batchMut.mutate({ action: 'activate' })}
        ><IconPlayerPlay size={14} /> Activate ({selected.length})</button>
        <button
          className="btn"
          style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
          disabled={!selected.length || batchMut.isPending}
          onClick={() => batchMut.mutate({ action: 'deactivate' })}
        ><IconPlayerStop size={14} /> Deactivate ({selected.length})</button>
        <button
          className="btn"
          disabled={!selected.length || batchMut.isPending}
          onClick={() => batchMut.mutate({ action: 'reboot' })}
        ><IconRestore size={14} /> Reboot ({selected.length})</button>
        {batchMut.isPending && <span className="spinner" />}
      </div>

      {results && (
        <div className="card" style={{ padding: 0 }}>
          <div className="sol-card-h">
            <span>Results</span>
            <span style={{ fontSize: 12 }}>
              <IconCheck size={13} style={{ color: 'var(--green)', marginRight: 4 }} />{results.success}
              <IconX size={13} style={{ color: 'var(--red)', marginLeft: 10, marginRight: 4 }} />{results.fail}
            </span>
          </div>
          {results.results?.filter(r => !r.success).length > 0 && (
            <div style={{ padding: 12, fontSize: 12 }}>
              {results.results.filter(r => !r.success).map(r => (
                <div key={r.onuId} style={{ color: 'var(--red)', marginBottom: 4 }}>
                  ONU {r.onuId}: {r.error || 'unknown error'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
