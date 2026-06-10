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
import ConfirmModal from '../../components/shared/ConfirmModal';
import ActionModal from '../../components/shared/ActionModal';
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

  const [active, setActive] = React.useState(null);   // { type:'confirm'|'modal', name, cfg }
  const [busy, setBusy] = React.useState(false);
  const [readResult, setReadResult] = React.useState(null);

  // Catálogo de acciones de ONU. type: confirm | modal | read | soon.
  const ACTIONS = {
    'Reboot':                          { type: 'confirm', msg: 'Reboot this ONU?', run: () => ontAPI.reboot(id) },
    'Enable ONU':                      { type: 'confirm', msg: 'Enable this ONU on the OLT?', run: () => ontAPI.enable(id) },
    'Disable ONU':                     { type: 'confirm', danger: true, msg: 'Disable this ONU? It will lose service.', run: () => ontAPI.disable(id) },
    'Start ONU':                       { type: 'confirm', msg: 'Start (activate) this ONU?', run: () => ontAPI.start(id) },
    'Stop ONU':                        { type: 'confirm', danger: true, msg: 'Stop (deactivate) this ONU?', run: () => ontAPI.stop(id) },
    'Recreate OLT config for this ONU':{ type: 'confirm', msg: 'Recreate (resync) the OLT config for this ONU?', run: () => ontAPI.resync(id) },
    'Restore to factory defaults':     { type: 'confirm', danger: true, msg: 'Restore this ONU to factory defaults?', run: () => ontAPI.restoreDefaults(id) },
    'Delete':                          { type: 'confirm', danger: true, msg: 'Delete this ONU? This cannot be undone.', run: () => ontAPI.delete(id), after: () => { qc.invalidateQueries({ queryKey: ['onts'] }); navigate('/onts'); } },

    'Change ONU type':       { type: 'modal', confirmLabel: 'Change', fields: [
      { key: 'lineProfileId', label: 'ONT line-profile ID', type: 'number' },
      { key: 'srvProfileId', label: 'ONT srv-profile ID', type: 'number' },
    ], run: (v) => ontAPI.changeType(id, v) },
    'Update ONU external ID':{ type: 'modal', confirmLabel: 'Save', fields: [
      { key: 'externalId', label: 'External ID', required: true },
    ], run: (v) => ontAPI.externalId(id, v.externalId) },
    'Configure speed profiles':{ type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'svlanId', label: 'S-VLAN', type: 'number' },
      { key: 'userVlan', label: 'User VLAN', type: 'number' },
      { key: 'upstreamKbps', label: 'Upstream (Kbps)', type: 'number' },
      { key: 'downstreamKbps', label: 'Downstream (Kbps)', type: 'number' },
    ], run: (v) => ontAPI.speedProfile(id, v) },
    'Change web user pass':  { type: 'modal', confirmLabel: 'Save', fields: [
      { key: 'webUser', label: 'Web user', default: 'admin' },
      { key: 'webPassword', label: 'Web password', type: 'password', required: true },
    ], run: (v) => ontAPI.webUserPass(id, v) },
    'Move ONU':              { type: 'modal', confirmLabel: 'Move', fields: [
      { key: 'targetBoard', label: 'Target board', type: 'number', required: true },
      { key: 'targetPort', label: 'Target port', type: 'number', required: true },
    ], run: (v) => ontAPI.move(id, v) },
    'Replace ONU by SN':     { type: 'modal', confirmLabel: 'Replace', fields: [
      { key: 'newSn', label: 'New serial number', required: true },
    ], run: (v) => ontAPI.replaceBySN(id, v) },
    'Update attached VLANs': { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'vlanId', label: 'VLAN ID', type: 'number', required: true },
      { key: 'ethPort', label: 'Ethernet port', type: 'number', default: 1 },
    ], run: (v) => ontAPI.updateVLANs(id, v) },
    'Update location details':{ type: 'modal', confirmLabel: 'Save', fields: [
      { key: 'name', label: 'Name' },
      { key: 'zone', label: 'Zone' },
      { key: 'odb', label: 'ODB' },
      { key: 'contact', label: 'Contact' },
      { key: 'latitude', label: 'Latitude', type: 'number' },
      { key: 'longitude', label: 'Longitude', type: 'number' },
    ], run: (v) => ontAPI.updateLocationDetails(id, v) },

    'Update ONU mode':       { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'ethPort', label: 'Ethernet port', type: 'number', default: 1 },
      { key: 'vlanId', label: 'Native VLAN', type: 'number' },
      { key: 'linkType', label: 'Link type', type: 'select', options: ['access', 'trunk', 'hybrid'], default: 'access' },
    ], run: (v) => ontAPI.updateMode(id, v) },
    'Update Management and VoIP IP': { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'ip', label: 'IP (vacío = DHCP)' }, { key: 'mask', label: 'Mask', default: '255.255.255.0' },
      { key: 'gateway', label: 'Gateway' }, { key: 'vlanId', label: 'VLAN', type: 'number' },
    ], run: (v) => ontAPI.updateMgmtIP(id, v) },
    'Mgmt IP':               { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'ip', label: 'IP (vacío = DHCP)' }, { key: 'vlanId', label: 'VLAN', type: 'number' },
    ], run: (v) => ontAPI.updateMgmtIP(id, v) },
    'Configure ethernet port':{ type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'ethPort', label: 'Ethernet port', type: 'number', default: 1 },
      { key: 'vlanId', label: 'VLAN', type: 'number' },
      { key: 'enabled', label: 'Enabled', type: 'checkbox', default: true },
    ], run: (v) => ontAPI.ethernetPort(id, v) },
    'Configure WiFi port':   { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'ssid', label: 'SSID' }, { key: 'password', label: 'Password', type: 'password' },
      { key: 'enabled', label: 'Enabled', type: 'checkbox', default: true },
    ], run: (v) => ontAPI.wifiPort(id, v) },
    'VoIP service':          { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'phoneNumber', label: 'Phone number' }, { key: 'sipUser', label: 'SIP user' },
      { key: 'sipPassword', label: 'SIP password', type: 'password' },
    ], run: (v) => ontAPI.voip(id, { ...v, enable: true }) },
    'Enable VoIP':           { type: 'modal', confirmLabel: 'Enable', fields: [
      { key: 'phoneNumber', label: 'Phone number' }, { key: 'sipUser', label: 'SIP user' },
      { key: 'sipPassword', label: 'SIP password', type: 'password' },
    ], run: (v) => ontAPI.voip(id, { ...v, enable: true }) },
    'Disable VoIP':          { type: 'confirm', danger: true, msg: 'Disable VoIP on this ONU?', run: () => ontAPI.disableVoip(id) },
    'Update IPTV':           { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'svlanId', label: 'IPTV S-VLAN', type: 'number' },
      { key: 'userVlan', label: 'User VLAN', type: 'number' },
      { key: 'enable', label: 'Enable IPTV', type: 'checkbox', default: true },
    ], run: (v) => ontAPI.updateIPTV(id, v) },
    'Update GPON channel':   { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'lineProfileId', label: 'Line-profile ID', type: 'number', required: true },
    ], run: (v) => ontAPI.gponChannel(id, v) },
    'Update EPON channel':   { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'lineProfileId', label: 'Line-profile ID', type: 'number', required: true },
    ], run: (v) => ontAPI.eponChannel(id, v) },
    'Change allocated ONU ID':{ type: 'modal', confirmLabel: 'Reallocate', fields: [
      { key: 'newOnuId', label: 'New ONU ID', type: 'number', required: true },
    ], run: (v) => ontAPI.reallocateId(id, v) },
    'TR069 Profile':         { type: 'modal', confirmLabel: 'Apply', fields: [
      { key: 'acsProfileId', label: 'ACS profile ID', required: true },
    ], run: (v) => ontAPI.tr069Profile(id, v) },
    'Firmware Upgrade - Reset to defaults': { type: 'modal', confirmLabel: 'Upgrade', fields: [
      { key: 'targetFile', label: 'Firmware file (opcional)' },
    ], run: (v) => ontAPI.firmwareUpgrade(id, v) },

    'Get status':            { type: 'read', title: 'ONU status', run: () => ontAPI.signal(id) },
    'Show running config':   { type: 'read', title: 'Running config', run: () => ontAPI.runningConfig(id) },
  };

  const exec = async (cfg, values) => {
    setBusy(true);
    try {
      await cfg.run(values);
      toast.success(`${cfg.name} OK`);
      qc.invalidateQueries({ queryKey: ['ont', id] });
      if (cfg.after) cfg.after();
      setActive(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || `${cfg.name} failed`);
    } finally { setBusy(false); }
  };

  const execRead = async (cfg) => {
    setBusy(true);
    try {
      const r = await cfg.run();
      setReadResult({ title: cfg.title, data: r.data?.data ?? r.data });
    } catch (e) {
      toast.error(e?.response?.data?.error || `${cfg.name} failed`);
    } finally { setBusy(false); }
  };

  const runAction = (name) => {
    const cfg = ACTIONS[name];
    if (!cfg || cfg.type === 'soon') { toast(`${name} — próximamente`, { icon: '⚙️' }); return; }
    const withName = { ...cfg, name };
    if (cfg.type === 'confirm') setActive({ type: 'confirm', cfg: withName });
    else if (cfg.type === 'modal') setActive({ type: 'modal', cfg: withName });
    else if (cfg.type === 'read') execRead(withName);
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

      {/* Confirm-style actions */}
      <ConfirmModal
        open={active?.type === 'confirm'}
        title={active?.cfg?.name}
        message={active?.cfg?.msg}
        danger={active?.cfg?.danger}
        loading={busy}
        confirmLabel={active?.cfg?.danger ? 'Yes, proceed' : 'Confirm'}
        onClose={() => !busy && setActive(null)}
        onConfirm={() => exec(active.cfg)}
      />

      {/* Form-style actions */}
      <ActionModal
        open={active?.type === 'modal'}
        title={active?.cfg?.name}
        fields={active?.cfg?.fields || []}
        confirmLabel={active?.cfg?.confirmLabel}
        confirmColor={active?.cfg?.danger ? 'var(--red)' : 'var(--accent)'}
        loading={busy}
        onClose={() => !busy && setActive(null)}
        onConfirm={(values) => exec(active.cfg, values)}
      />

      {/* Read-only result (Get status / running config / SW info) */}
      {readResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReadResult(null); }}>
          <div style={{ width: 640, maxWidth: '92vw', maxHeight: '85vh', overflow: 'auto',
            background: 'var(--sidebar-bg)', border: '1px solid var(--border-light)', borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{readResult.title}</span>
              <button className="btn-icon" onClick={() => setReadResult(null)}>✕</button>
            </div>
            <pre style={{ padding: 16, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text-secondary)', margin: 0 }}>
              {typeof readResult.data === 'string' ? readResult.data : JSON.stringify(readResult.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
