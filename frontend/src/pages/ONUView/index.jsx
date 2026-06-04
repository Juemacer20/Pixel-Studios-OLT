import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowLeft, IconReload, IconRefresh, IconRotate, IconTrash, IconRouter,
  IconActivity, IconDeviceFloppy, IconHistory, IconSettings, IconBolt,
  IconNetwork, IconDeviceLandlinePhone, IconAdjustments,
} from '@tabler/icons-react';
import { ontAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import SignalValue from '../../components/shared/SignalValue';
import SignalChart from '../../components/signal/SignalChart';
import EthernetPorts from '../../components/onts/EthernetPorts';
import ServicesConfig from '../../components/onts/ServicesConfig';
import WANConfig from '../../components/onts/WANConfig';
import DHCPLeases from '../../components/onts/DHCPLeases';
import toast from 'react-hot-toast';

// ── Las 33 funciones por ONU (SmartOLT /onu/view) ──
const ACTION_GROUPS = [
  { title: 'Configuration', Icon: IconSettings, color: 'var(--accent)', actions: [
    'Change ONU type', 'Update ONU external ID', 'Configure speed profiles',
    'Configure ethernet port', 'Configure WiFi port', 'Change web user pass',
    'Update ONU mode', 'Update attached VLANs', 'Update location details',
  ]},
  { title: 'Power & State', Icon: IconBolt, color: 'var(--orange)', actions: [
    'Reboot', 'Enable ONU', 'Disable ONU', 'Start ONU', 'Stop ONU',
    'Restore to factory defaults', 'Firmware Upgrade - Reset to defaults',
  ]},
  { title: 'Network', Icon: IconNetwork, color: 'var(--cyan)', actions: [
    'Update Management and VoIP IP', 'TR069 Profile', 'Mgmt IP',
    'Update GPON channel', 'Update EPON channel', 'Change allocated ONU ID',
    'Move ONU', 'Replace ONU by SN',
  ]},
  { title: 'Services', Icon: IconDeviceLandlinePhone, color: 'var(--green)', actions: [
    'VoIP service', 'Enable VoIP', 'Disable VoIP', 'Update IPTV',
  ]},
  { title: 'Maintenance', Icon: IconAdjustments, color: 'var(--purple)', actions: [
    'Recreate OLT config for this ONU', 'Delete', 'History',
  ]},
];

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0',
      borderBottom: '1px solid rgba(120,160,200,.07)', fontSize: 12.5 }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{v ?? '—'}</span>
    </div>
  );
}

function Panel({ title, more, children, pad = 14 }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="sol-card-h"><span>{title}</span>{more}</div>
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

export default function ONUView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: ont, isLoading } = useQuery({
    queryKey: ['ont', id],
    queryFn: () => ontAPI.get(id).then(r => r.data?.data ?? r.data),
    retry: 1,
  });

  const rebootMut = useMutation({
    mutationFn: () => ontAPI.reboot(id),
    onSuccess: () => toast.success('Reboot sent'),
    onError: () => toast.error('Reboot failed'),
  });
  const deleteMut = useMutation({
    mutationFn: () => ontAPI.delete(id),
    onSuccess: () => { toast.success('ONU deleted'); qc.invalidateQueries({ queryKey: ['onts'] }); navigate('/onts'); },
    onError: () => toast.error('Delete failed'),
  });

  const runAction = (name) => {
    if (name === 'Reboot') { if (confirm('Reboot this ONU?')) rebootMut.mutate(); return; }
    if (name === 'Delete') { if (confirm('Delete this ONU? This cannot be undone.')) deleteMut.mutate(); return; }
    // TODO: cablear cada acción a su endpoint en el backend (OLT driver)
    toast(`${name} — próximamente`, { icon: '⚙️' });
  };

  const o = ont || {};
  const name = o.client?.name || o.name || `ONU ${id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => navigate('/onts')}><IconArrowLeft size={14} /> Back</button>
        <h1 className="page-title" style={{ margin: 0 }}>View ONU</h1>
        <StatusBadge status={o.status} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
            onClick={() => runAction('Reboot')}><IconReload size={13} /> Reboot</button>
          <button className="btn" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
            onClick={() => runAction('Recreate OLT config for this ONU')}><IconRefresh size={13} /> Resync config</button>
          <button className="btn" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}
            onClick={() => runAction('Restore to factory defaults')}><IconRotate size={13} /> Restore default</button>
          <button className="btn btn-danger" onClick={() => runAction('Delete')}><IconTrash size={13} /> Delete</button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading ONU…</div></div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: data + status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title={<><IconRouter size={14} style={{ verticalAlign: -2 }} /> ONU details</>}>
            <Row k="OLT" v={o.olt?.name} />
            <Row k="Board / Port" v={o.board != null ? `${o.board} / ${o.port}` : (o.description || o.pon_port)} />
            <Row k="ONU type" v={o.onu_type || o.model} />
            <Row k="GPON/EPON channel" v={o.channel || o.pon_port} />
            <Row k="ONU external ID" v={o.external_id} />
            <Row k="Name" v={name} />
            <Row k="Zone" v={o.zone?.name || o.zone} />
            <Row k="ODB" v={o.odb?.name || o.odb} />
            <Row k="Address" v={o.client?.address || o.address} />
            <Row k="Contact" v={o.client?.phone || o.contact} />
            <Row k="Authorization date" v={o.created_at ? new Date(o.created_at).toLocaleString() : null} />
          </Panel>

          <Panel title={<><IconActivity size={14} style={{ verticalAlign: -2 }} /> Status</>}>
            <Row k="State" v={<StatusBadge status={o.status} />} />
            <Row k="RX power (ONU)" v={<SignalValue value={o.rx_power} size="sm" />} />
            <Row k="TX power" v={<SignalValue value={o.tx_power} size="sm" />} />
            <Row k="OLT Rx signal" v={o.olt_rx != null ? <SignalValue value={o.olt_rx} size="sm" /> : null} />
            <Row k="MAC" v={o.mac} />
            <Row k="Distance" v={o.distance != null ? `${o.distance} m` : null} />
            <Row k="Mgmt IP" v={o.mgmt_ip || o.ip_address} />
            <Row k="Firmware" v={o.firmware || o.sw_version} />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn" style={{ fontSize: 11 }} onClick={() => runAction('Get status')}>Get status</button>
              <button className="btn" style={{ fontSize: 11 }} onClick={() => runAction('Show running config')}>Show running config</button>
            </div>
          </Panel>
        </div>

        {/* Right: charts, services, actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="📈 Traffic / Signal">
            <SignalChart ontId={id} height={190} />
          </Panel>

          <Panel title="Ethernet ports" pad={0}><EthernetPorts ontId={id} /></Panel>
          <Panel title="Services (VoIP / IPTV / CATV)" pad={0}><ServicesConfig ontId={id} /></Panel>
          <Panel title="WAN / IP" pad={0}><WANConfig ontId={id} /></Panel>
          <Panel title="DHCP leases" pad={0}><DHCPLeases ontId={id} /></Panel>

          {/* 33 ACTIONS */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sol-card-h"><span><IconDeviceFloppy size={14} style={{ verticalAlign: -2 }} /> ONU actions</span>
              <span className="more" onClick={() => runAction('Save configuration')}>💾 Save configuration</span></div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACTION_GROUPS.map(g => (
                <div key={g.title}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <g.Icon size={14} style={{ color: g.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{g.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {g.actions.map(a => (
                      <button key={a}
                        className={a === 'Delete' ? 'btn btn-danger' : 'btn'}
                        style={{ fontSize: 11.5 }}
                        onClick={() => runAction(a)}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
