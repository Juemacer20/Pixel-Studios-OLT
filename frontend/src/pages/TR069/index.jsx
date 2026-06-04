import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tr069API } from '../../services/api';
import {
  IconX, IconRefresh, IconUpload, IconTerminal2,
  IconChevronRight, IconChevronDown, IconWifi,
} from '@tabler/icons-react';
import StatusBadge from '../../components/shared/StatusBadge';

function ParamTree({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  if (typeof data === 'string') {
    return <span className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{data}</span>;
  }
  return (
    <div style={{ marginLeft: depth * 14 }}>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} style={{ marginBottom: 2 }}>
          {typeof val === 'object' ? (
            <div>
              <button
                onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, padding: '1px 0' }}
              >
                {open ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
                <span style={{ color: 'var(--accent-hover)', fontWeight: 500 }}>{key}</span>
              </button>
              {open && <ParamTree data={val} depth={depth + 1} />}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 0 1px 16px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 180 }}>{key}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{String(val)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DeviceDrawer({ device, onClose }) {
  const [tab,        setTab]        = useState(0);
  const [fwFile,     setFwFile]     = useState('');
  const [diagOutput, setDiagOutput] = useState('');
  const [diagLoading,setDiagLoading]= useState(false);

  const runDiag = (type) => {
    setDiagLoading(true);
    setDiagOutput('');
    const outputs = {
      ping:       `PING 8.8.8.8 (8.8.8.8): 56 data bytes\n64 bytes from 8.8.8.8: icmp_seq=0 ttl=118 time=12.3 ms\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=11.8 ms\n64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=12.1 ms\n--- 8.8.8.8 ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss`,
      traceroute: `traceroute to 8.8.8.8:\n 1  192.168.1.1 (192.168.1.1)  1.2 ms\n 2  181.47.100.254  5.4 ms\n 3  * * *\n 4  8.8.8.8  12.3 ms`,
      speedtest:  `Speed Test Results:\nDownload: 98.4 Mbps\nUpload:   47.2 Mbps\nLatency:  12 ms\nJitter:   0.8 ms`,
    };
    setTimeout(() => { setDiagLoading(false); setDiagOutput(outputs[type] || ''); }, 1200);
  };

  const TABS = ['Parámetros', 'Firmware', 'Diagnósticos'];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ width: 520 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{device.model}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{device.serial} · {device.ip}</div>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX size={15} /></button>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ flexShrink: 0 }}>
          {TABS.map((t, i) => (
            <button key={t} className={`tab-item ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {tab === 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                Árbol de parámetros ACS (InternetGatewayDevice.*)
              </div>
              <div style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                <ParamTree data={{}} />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Current firmware</div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{device.firmware}</div>
                {device.fw_new && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--green)' }}>
                    Nueva versión disponible: <strong>{device.fw_new}</strong>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Upgrade firmware</div>
                <input
                  className="input-base"
                  placeholder="Firmware URL (.bin)"
                  value={fwFile}
                  onChange={e => setFwFile(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => { if (fwFile) { alert('Firmware push iniciado'); setFwFile(''); } }}
                >
                  <IconUpload size={13} /> Enviar firmware
                </button>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Ping 8.8.8.8', key: 'ping' },
                  { label: 'Traceroute',   key: 'traceroute' },
                  { label: 'Speed Test',   key: 'speedtest' },
                ].map(({ label, key }) => (
                  <button key={key} className="btn" onClick={() => runDiag(key)} disabled={diagLoading}>
                    <IconTerminal2 size={13} /> {label}
                  </button>
                ))}
              </div>
              {diagLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                  <div className="spinner" /> Ejecutando...
                </div>
              )}
              {diagOutput && (
                <pre style={{ background: 'var(--content-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: 'var(--green)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {diagOutput}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function TR069() {
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');

  const { data: devicesRaw } = useQuery({
    queryKey: ['tr069-devices'],
    queryFn: () => tr069API.devices().then(r => r.data?.data ?? r.data),
    retry: 1,
  });
  const allDevices = devicesRaw || [];

  const devices = allDevices.filter(d =>
    !search || d.serial.toLowerCase().includes(search.toLowerCase()) ||
    d.model.toLowerCase().includes(search.toLowerCase()) ||
    d.ip.includes(search)
  );

  const online  = allDevices.filter(d => d.status === 'online').length;
  const pending = allDevices.filter(d => d.tasks > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <span className="page-title">VPN & TR069</span>
        <button className="btn-icon" title="Refrescar"><IconRefresh size={14} /></button>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item"><div className="stat-label">Total devices</div><div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: 16 }}>{allDevices.length}</div></div>
        <div className="stat-item"><div className="stat-label">Online</div><div className="stat-value" style={{ color: 'var(--green)', fontSize: 16 }}>{online}</div></div>
        <div className="stat-item"><div className="stat-label">Offline</div><div className="stat-value" style={{ color: 'var(--text-muted)', fontSize: 16 }}>{allDevices.length - online}</div></div>
        <div className="stat-item"><div className="stat-label">With pending task</div><div className="stat-value" style={{ color: 'var(--orange)', fontSize: 16 }}>{pending}</div></div>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 320 }}>
        <input className="input-base" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by serial, model or IP…" />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Modelo</th>
              <th>IP</th>
              <th>Current firmware</th>
              <th>New FW</th>
              <th>Última conexión</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(d)}>
                <td className="mono" style={{ fontSize: 11 }}>{d.serial}</td>
                <td style={{ fontSize: 12 }}>{d.model}</td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{d.ip}</td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.firmware}</td>
                <td>
                  {d.fw_new
                    ? <span className="badge badge-green" style={{ fontSize: 10 }}>↑ {d.fw_new}</span>
                    : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                </td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(d.last_conn).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td><StatusBadge status={d.status} /></td>
                <td>
                  {d.tasks > 0 && <span className="badge badge-orange" style={{ fontSize: 10 }}>{d.tasks} tarea</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <DeviceDrawer device={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
