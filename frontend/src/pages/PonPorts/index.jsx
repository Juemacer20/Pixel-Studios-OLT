import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { oltAPI, ontAPI } from '../../services/api';
import SignalValue from '../../components/shared/SignalValue';
import StatusBadge from '../../components/shared/StatusBadge';
import { IconChevronRight, IconAntenna, IconX, IconServer } from '@tabler/icons-react';


function buildMockPorts(oltId) {
  return Array.from({ length: 8 }, (_, i) => ({
    id: oltId * 100 + i,
    port_number: `0/${Math.floor(i / 4)}/${i % 4}`,
    ont_count: 4 + (i * 3 + oltId) % 29,
    capacity: 32,
    avg_rx: -(18 + (i + oltId) % 10),
    status: i === 3 ? 'offline' : 'online',
  }));
}

function buildMockONTs(portId) {
  const count = 4 + portId % 12;
  return Array.from({ length: count }, (_, i) => ({
    id: portId * 100 + i,
    serial_number: `HWTC${String(portId * 100 + i + 1000000).slice(0, 8)}`,
    client: i % 3 === 0 ? null : { name: `Cliente ${portId}-${i + 1}` },
    status: ['online', 'online', 'online', 'offline', 'los'][i % 5],
    rx_power: -(18 + (i + portId) % 10),
    tx_power: -(2 + i % 3),
  }));
}

function PortCard({ port, selected, onClick }) {
  const pct = Math.round((port.ont_count / port.capacity) * 100);
  const barColor = port.status === 'offline' ? 'var(--text-muted)' :
    pct > 80 ? 'var(--orange)' : 'var(--accent)';

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(31,111,235,0.08)' : 'var(--card-bg)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {port.port_number}
        </span>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: port.status === 'online' ? 'var(--green)' : 'var(--text-muted)',
            boxShadow: port.status === 'online' ? '0 0 6px var(--green)' : 'none',
          }}
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {port.ont_count} / {port.capacity} ONTs
      </div>

      {/* Usage bar */}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <SignalValue value={port.avg_rx} size="xs" />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}%</span>
      </div>
    </div>
  );
}

export default function PonPorts() {
  const [selectedOLT, setSelectedOLT] = useState(1);
  const [selectedPort, setSelectedPort] = useState(null);

  const { data: oltsRaw } = useQuery({
    queryKey: ['olts'],
    queryFn: () => oltAPI.list().then(r => r.data?.data ?? r.data),
    retry: 1,
  });
  const olts = oltsRaw || [];

  const { data: portsRaw } = useQuery({
    queryKey: ['olt-ports', selectedOLT],
    queryFn: () => oltAPI.ports(selectedOLT).then(r => r.data?.data ?? r.data),
    retry: 1,
    enabled: !!selectedOLT,
  });
  const ports = portsRaw?.length ? portsRaw : buildMockPorts(selectedOLT);

  const { data: ontsRaw } = useQuery({
    queryKey: ['port-onts', selectedPort?.id],
    queryFn: () => ontAPI.list({ port: selectedPort?.port_number }).then(r => r.data?.data ?? r.data),
    retry: 1,
    enabled: !!selectedPort,
  });
  const portONTs = ontsRaw?.length ? ontsRaw : (selectedPort ? buildMockONTs(selectedPort.id) : []);

  const totalONTs   = ports.reduce((a, p) => a + (p.ont_count || 0), 0);
  const onlinePorts = ports.filter(p => p.status === 'online').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <span className="page-title">Puertos PON</span>
        <select
          className="select-base"
          value={selectedOLT}
          onChange={e => { setSelectedOLT(Number(e.target.value)); setSelectedPort(null); }}
        >
          {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Total Puertos</div>
          <div className="stat-value" style={{ color: 'var(--cyan)', fontSize: 16 }}>{ports.length}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Activos</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 16 }}>{onlinePorts}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total ONTs</div>
          <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: 16 }}>{totalONTs}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Ocupación</div>
          <div className="stat-value" style={{ color: 'var(--orange)', fontSize: 16 }}>
            {ports.length ? Math.round((totalONTs / (ports.length * 32)) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Ports grid */}
        <div style={{ flex: '0 0 auto', width: selectedPort ? '55%' : '100%', transition: 'width 0.25s' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}>
            {ports.map(port => (
              <PortCard
                key={port.id}
                port={port}
                selected={selectedPort?.id === port.id}
                onClick={() => setSelectedPort(prev => prev?.id === port.id ? null : port)}
              />
            ))}
          </div>
        </div>

        {/* ONT list panel */}
        {selectedPort && (
          <div style={{
            flex: 1,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconAntenna size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Puerto {selectedPort.port_number}
                </span>
                <span className="badge badge-blue">{portONTs.length} ONTs</span>
              </div>
              <button className="btn-icon" onClick={() => setSelectedPort(null)}>
                <IconX size={13} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Cliente</th>
                    <th>RX</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {portONTs.map(ont => (
                    <tr key={ont.id}>
                      <td className="mono" style={{ fontSize: 11 }}>{ont.serial_number}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {ont.client?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><SignalValue value={ont.rx_power} /></td>
                      <td><StatusBadge status={ont.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
