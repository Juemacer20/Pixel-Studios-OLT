import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { oltAPI } from '../../services/api';

function signalColor(val) {
  if (val == null) return 'var(--text-muted)';
  if (val > -25) return 'var(--green)';
  if (val > -27) return 'var(--orange)';
  return 'var(--red)';
}

function fmtDbm(val) {
  if (val == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'monospace', color: signalColor(val) }}>{val.toFixed(2)}</span>;
}

function relTime(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function exportCSV(onts) {
  const header = 'Status,Rx OLT (dBm),Rx ONU (dBm),Distance (m),Name,SN,OLT,Interface,Last Seen';
  const rows = onts.map(o => [
    o.status,
    o.olt_rx_power ?? '',
    o.rx_power ?? '',
    o.distance ?? '',
    (o.description || '').replace(/,/g, ' '),
    o.serial_number,
    o.olt?.name || '',
    o.description?.startsWith('gpon') ? o.description : '',
    o.last_seen ? new Date(o.last_seen).toISOString() : '',
  ].join(','));
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `diagnostics-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

export default function Diagnostics() {
  const [status, setStatus] = useState('');
  const [oltId, setOltId] = useState('');

  const { data: oltsData } = useQuery({
    queryKey: ['olts-list'],
    queryFn: () => oltAPI.list({}).then(r => r.data?.data ?? r.data),
  });
  const olts = Array.isArray(oltsData) ? oltsData : oltsData?.items || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['diagnostics', status, oltId],
    queryFn: () => api.get('/diagnostics', { params: { status: status || undefined, olt_id: oltId || undefined, limit: 2000 } }).then(r => r.data?.data ?? r.data),
  });

  const onts = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const selectStyle = {
    background: '#1a2035', border: '1px solid var(--border)', color: 'var(--text-primary)',
    borderRadius: 4, padding: '6px 12px', fontSize: 13,
  };
  const cellStyle = { padding: '6px 12px' };
  const monoCell = { ...cellStyle, fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 11 };

  return (
    <div style={{ padding: 16, minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
          <option value="">All status</option>
          <option value="online">Online</option>
          <option value="offline">Offline / LOS</option>
        </select>

        <select value={oltId} onChange={e => setOltId(e.target.value)} style={selectStyle}>
          <option value="">All OLTs</option>
          {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <button onClick={() => refetch()} style={{ ...selectStyle, cursor: 'pointer' }}>
          ↻ Refresh
        </button>

        <button onClick={() => exportCSV(onts)} style={{
          background: '#0e3a5c', border: '1px solid rgba(0,212,255,0.27)', color: 'var(--cyan)',
          borderRadius: 4, padding: '6px 12px', fontSize: 13, cursor: 'pointer', marginLeft: 'auto',
        }}>
          ↓ Export CSV
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{onts.length} ONTs</span>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '64px 0' }}>Cargando diagnósticos…</div>
      ) : onts.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '64px 0' }}>Sin datos de señal todavía</div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', fontSize: 13, textAlign: 'left' }}>
            <thead style={{ background: '#0d1b35', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>
              <tr>
                <th style={{ padding: '8px 12px' }}>Estado</th>
                <th style={{ padding: '8px 12px' }}>Rx OLT (dBm)</th>
                <th style={{ padding: '8px 12px' }}>Rx ONU (dBm)</th>
                <th style={{ padding: '8px 12px' }}>Dist (m)</th>
                <th style={{ padding: '8px 12px' }}>ONU</th>
                <th style={{ padding: '8px 12px' }}>Cliente</th>
                <th style={{ padding: '8px 12px' }}>SN</th>
                <th style={{ padding: '8px 12px' }}>Zona</th>
                <th style={{ padding: '8px 12px' }}>ODB</th>
                <th style={{ padding: '8px 12px' }}>OLT</th>
                <th style={{ padding: '8px 12px' }}>Último cambio</th>
              </tr>
            </thead>
            <tbody>
              {onts.map((ont, i) => (
                <tr key={ont.id} style={{
                  borderTop: '1px solid var(--border)',
                  background: i % 2 === 0 ? '#0d1b2e' : '#0a1626',
                }}>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      marginRight: 6, background: ont.status === 'ONLINE' ? 'var(--green)' : 'var(--red)',
                    }} />
                    <span style={{ color: ont.status === 'ONLINE' ? 'var(--green)' : 'var(--red)' }}>
                      {ont.status}
                    </span>
                  </td>
                  <td style={cellStyle}>{fmtDbm(ont.olt_rx_power)}</td>
                  <td style={cellStyle}>{fmtDbm(ont.rx_power)}</td>
                  <td style={{ ...monoCell, color: 'var(--text-muted)' }}>
                    {ont.distance != null ? ont.distance : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ ...cellStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                    {ont.description?.startsWith('gpon') ? ont.description : `${ont.board ?? '?'}/${ont.port ?? '?'}/${ont.onu_id ?? ont.onuId ?? '?'}`}
                  </td>
                  <td style={{ ...cellStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                    {ont.description && !ont.description?.startsWith('gpon') ? ont.description : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>sin nombre</span>}
                  </td>
                  <td style={monoCell}>{ont.serial_number}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-muted)', fontSize: 11 }}>{ont.zone || '—'}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-muted)', fontSize: 11 }}>{ont.odb || '—'}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-muted)' }}>{ont.olt?.name}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-muted)', fontSize: 11 }}>{relTime(ont.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
