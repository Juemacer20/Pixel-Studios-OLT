import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconGitCompare, IconRefresh } from '@tabler/icons-react';
import { oltAPI } from '../../services/api';
import toast from 'react-hot-toast';

const arr = (r) => r?.data?.data ?? r?.data ?? [];
const TYPE_LABEL = {
  missing_in_db: { label: 'In OLT, not in DB', color: 'var(--orange)' },
  missing_in_olt: { label: 'In DB, not in OLT', color: 'var(--red)' },
  status: { label: 'Status mismatch', color: 'var(--yellow)' },
};

export default function ConfigComparison() {
  const [oltId, setOltId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const { data: olts } = useQuery({ queryKey: ['olts-list'], queryFn: () => oltAPI.list().then(arr) });

  const scan = async () => {
    if (!oltId) { toast.error('Select an OLT'); return; }
    setBusy(true); setResult(null);
    try {
      const r = await oltAPI.compare(oltId);
      setResult(r.data?.data);
      toast.success('Scan complete');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Scan failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <span className="page-title"><IconGitCompare size={18} style={{ verticalAlign: -3, marginRight: 6 }} />Config mismatches</span>
      </div>

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input-base" style={{ maxWidth: 280 }} value={oltId} onChange={(e) => setOltId(e.target.value)}>
          <option value="">Select OLT…</option>
          {(olts || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={scan} disabled={busy}>
          <IconRefresh size={13} /> {busy ? 'Scanning…' : 'Scan & Compare'}
        </button>
        {result && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            DB: {result.counts.db} · OLT: {result.counts.olt} · Mismatches: <b style={{ color: result.counts.mismatches ? 'var(--orange)' : 'var(--green)' }}>{result.counts.mismatches}</b>
          </span>
        )}
      </div>

      {busy && (
        <div className="card"><div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Scanning OLT (read-only)…</div></div>
      )}

      {result && !busy && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {result.mismatches.length === 0 ? (
            <div className="empty-state" style={{ color: 'var(--green)' }}>✓ No mismatches — DB and OLT are in sync</div>
          ) : (
            <table className="table-base">
              <thead><tr><th>Type</th><th>Serial</th><th>Field</th><th>DB value</th><th>OLT value</th></tr></thead>
              <tbody>
                {result.mismatches.map((m, i) => (
                  <tr key={i}>
                    <td><span className="badge" style={{ color: TYPE_LABEL[m.type]?.color }}>{TYPE_LABEL[m.type]?.label || m.type}</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{m.serial}</td>
                    <td>{m.field}</td>
                    <td style={{ color: 'var(--green)' }}>{m.dbValue}</td>
                    <td style={{ color: 'var(--orange)' }}>{m.oltValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
