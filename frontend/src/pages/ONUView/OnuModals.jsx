import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ontAPI } from '../../services/api';

function ModalBackdrop({ onClose }) {
  return <div className="modal-backdrop" onClick={onClose} />;
}

function ModalFrame({ title, children, footer, onClose }) {
  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div className="modal show onu-ui-modal onu-ui-modal-dropdowns" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>{title}</h3>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function SaveFooter({ onClose, onSave, busy, saveLabel, danger }) {
  return (
    <>
      <a href="#" className="btn btn-link" onClick={onClose}>Close</a>
      <a href="#"
        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        onClick={busy ? undefined : onSave}>
        {busy ? 'Working…' : (saveLabel || 'Save')}
      </a>
    </>
  );
}

/* ─── External ID ─────────────────────────────── */
export function ExtIdModal({ open, ontId, current, onClose }) {
  const [val, setVal] = useState(current || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setVal(current || ''); }, [open, current]);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.externalId(ontId, val); toast.success('External ID updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update ONU external ID" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">ONU external ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={val} onChange={e => setVal(e.target.value)} />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Speed Profile ────────────────────────────── */
export function SpeedProfileModal({ open, ontId, current, onClose }) {
  const [download, setDownload] = useState('');
  const [upload, setUpload] = useState('');
  const [vlan, setVlan] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!download || !upload) { toast.error('Select download and upload speeds'); return; }
    setBusy(true);
    try { await ontAPI.speedProfile(ontId, { downloadSpeed: download, uploadSpeed: upload, vlanId: vlan }); toast.success('Speed profile updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Configure speed profiles" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Download speed</label>
        <div className="col-sm-6">
          <select className="form-control" value={download} onChange={e => setDownload(e.target.value)}>
            <option value="">— Select —</option>
            <option value="10">10M</option>
            <option value="20">20M</option>
            <option value="30">30M</option>
            <option value="40">40M</option>
            <option value="50">50M</option>
            <option value="60">60M</option>
            <option value="80">80M</option>
            <option value="100">100M</option>
            <option value="200">200M</option>
            <option value="300">300M</option>
            <option value="500">500M</option>
            <option value="1000">1G</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Upload speed</label>
        <div className="col-sm-6">
          <select className="form-control" value={upload} onChange={e => setUpload(e.target.value)}>
            <option value="">— Select —</option>
            <option value="10">10M</option>
            <option value="20">20M</option>
            <option value="30">30M</option>
            <option value="40">40M</option>
            <option value="50">50M</option>
            <option value="60">60M</option>
            <option value="80">80M</option>
            <option value="100">100M</option>
            <option value="200">200M</option>
            <option value="300">300M</option>
            <option value="500">500M</option>
            <option value="1000">1G</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Ethernet Port ───────────────────────────── */
export function EthernetPortModal({ open, ontId, current, onClose }) {
  const [port, setPort] = useState('eth_0/1');
  const [mode, setMode] = useState('LAN');
  const [vlan, setVlan] = useState('');
  const [dhcp, setDhcp] = useState('No control');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.ethernetPort(ontId, { ethPort: port, mode, vlanId: vlan, dhcp }); toast.success('Ethernet port configured'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Configure ethernet port" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Port</label>
        <div className="col-sm-6">
          <select className="form-control" value={port} onChange={e => setPort(e.target.value)}>
            <option value="eth_0/1">eth_0/1</option>
            <option value="eth_0/2">eth_0/2</option>
            <option value="eth_0/3">eth_0/3</option>
            <option value="eth_0/4">eth_0/4</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Mode</label>
        <div className="col-sm-6">
          <select className="form-control" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="LAN">LAN</option>
            <option value="Access">Access</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Trunk">Trunk</option>
            <option value="Transparent">Transparent</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">DHCP</label>
        <div className="col-sm-6">
          <select className="form-control" value={dhcp} onChange={e => setDhcp(e.target.value)}>
            <option value="No control">No control</option>
            <option value="Enabled">Enabled</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── WiFi Port ────────────────────────────────── */
export function WifiPortModal({ open, ontId, current, onClose }) {
  const [port, setPort] = useState('wifi_0/1');
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState('Access point');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.wifiPort(ontId, { wifiPort: port, ssid, password: pass, mode }); toast.success('WiFi port configured'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Configure WiFi port" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Port</label>
        <div className="col-sm-6">
          <select className="form-control" value={port} onChange={e => setPort(e.target.value)}>
            <option value="wifi_0/1">wifi_0/1 (2.4 GHz)</option>
            <option value="wifi_0/5">wifi_0/5 (5 GHz)</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">SSID</label>
        <div className="col-sm-6">
          <input className="form-control" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="SSID" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Password</label>
        <div className="col-sm-6">
          <input className="form-control" value={pass} onChange={e => setPass(e.target.value)} placeholder="WiFi password" type="password" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Mode</label>
        <div className="col-sm-6">
          <select className="form-control" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="Access point">Access point</option>
            <option value="Bridge">Bridge</option>
          </select>
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Web User Pass ────────────────────────────── */
export function WebUserPassModal({ open, ontId, onClose }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!user || !pass) { toast.error('Fill in both fields'); return; }
    setBusy(true);
    try { await ontAPI.webUserPass(ontId, { webUser: user, webPassword: pass }); toast.success('Web credentials updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Change web user pass" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Web username</label>
        <div className="col-sm-6">
          <input className="form-control" value={user} onChange={e => setUser(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Web password</label>
        <div className="col-sm-6">
          <input className="form-control" value={pass} onChange={e => setPass(e.target.value)} type="password" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Replace by SN ─────────────────────────────── */
export function ReplaceBySNModal({ open, ontId, onClose }) {
  const [sn, setSn] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!sn) { toast.error('Enter serial number'); return; }
    setBusy(true);
    try { await ontAPI.replaceBySN(ontId, { newSn: sn }); toast.success('ONU replaced by SN'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Replace ONU by SN" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">New SN</label>
        <div className="col-sm-6">
          <input className="form-control" value={sn} onChange={e => setSn(e.target.value)} placeholder="e.g. HWTC12345678" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Update Mode ───────────────────────────────── */
export function UpdateModeModal({ open, ontId, current, onClose }) {
  const [mode, setMode] = useState(current?.mode || 'Routing');
  const [wanMode, setWanMode] = useState(current?.wan_mode || 'PPPoE');
  const [pppoeUser, setPppoeUser] = useState(current?.pppoe_user || '');
  const [pppoePass, setPppoePass] = useState(current?.pppoe_pass || '');
  const [vlan, setVlan] = useState(current?.vlan_id || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.updateMode(ontId, { mode, wanMode, pppoeUser, pppoePass, vlanId: vlan }); toast.success('ONU mode updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update ONU mode" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">ONU mode</label>
        <div className="col-sm-6">
          <select className="form-control" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="Routing">Routing</option>
            <option value="Bridging">Bridging</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">WAN mode</label>
        <div className="col-sm-6">
          <select className="form-control" value={wanMode} onChange={e => setWanMode(e.target.value)}>
            <option value="PPPoE">PPPoE</option>
            <option value="DHCP">DHCP</option>
            <option value="Static">Static IP</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">PPPoE username</label>
        <div className="col-sm-6">
          <input className="form-control" value={pppoeUser} onChange={e => setPppoeUser(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">PPPoE password</label>
        <div className="col-sm-6">
          <input className="form-control" value={pppoePass} onChange={e => setPppoePass(e.target.value)} type="password" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── VLANs ────────────────────────────────────── */
export function VLANModal({ open, ontId, current, onClose }) {
  const [vlan, setVlan] = useState(current?.vlan_id || '');
  const [port, setPort] = useState('1');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!vlan) { toast.error('Enter VLAN ID'); return; }
    setBusy(true);
    try { await ontAPI.updateVLANs(ontId, { vlanId: vlan, ethPort: port }); toast.success('VLANs updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update attached VLANs" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Ethernet port</label>
        <div className="col-sm-6">
          <select className="form-control" value={port} onChange={e => setPort(e.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Update Location ──────────────────────────── */
export function UpdateLocationModal({ open, ontId, current, onClose }) {
  const [zone, setZone] = useState(current?.zone || '');
  const [odb, setOdb] = useState(current?.odb || '');
  const [address, setAddress] = useState(current?.address || '');
  const [contact, setContact] = useState(current?.contact || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.updateLocationDetails(ontId, { zone, odb, address, contact }); toast.success('Location updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update location details" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Zone</label>
        <div className="col-sm-6">
          <input className="form-control" value={zone} onChange={e => setZone(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">ODB (Splitter)</label>
        <div className="col-sm-6">
          <input className="form-control" value={odb} onChange={e => setOdb(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Address</label>
        <div className="col-sm-6">
          <input className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Contact</label>
        <div className="col-sm-6">
          <input className="form-control" value={contact} onChange={e => setContact(e.target.value)} />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Mgmt IP ──────────────────────────────────── */
export function MgmtIPModal({ open, ontId, current, onClose }) {
  const [ip, setIp] = useState(current?.mgmt_ip || '');
  const [mask, setMask] = useState(current?.mgmt_ip_mask || '');
  const [gateway, setGateway] = useState(current?.mgmt_ip_gateway || '');
  const [dns1, setDns1] = useState(current?.mgmt_ip_dns1 || '');
  const [dns2, setDns2] = useState(current?.mgmt_ip_dns2 || '');
  const [vlan, setVlan] = useState(current?.mgmt_ip_vlan_id || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.updateMgmtIP(ontId, { ipAddress: ip, subnetMask: mask, defaultGateway: gateway, dns1, dns2, vlanId: vlan }); toast.success('Mgmt IP updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update Management and VoIP IP" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">IP address</label>
        <div className="col-sm-6">
          <input className="form-control" value={ip} onChange={e => setIp(e.target.value)} placeholder="10.0.0.1" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Subnet mask</label>
        <div className="col-sm-6">
          <input className="form-control" value={mask} onChange={e => setMask(e.target.value)} placeholder="255.255.255.0" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Gateway</label>
        <div className="col-sm-6">
          <input className="form-control" value={gateway} onChange={e => setGateway(e.target.value)} placeholder="10.0.0.1" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">DNS 1</label>
        <div className="col-sm-6">
          <input className="form-control" value={dns1} onChange={e => setDns1(e.target.value)} placeholder="8.8.8.8" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">DNS 2</label>
        <div className="col-sm-6">
          <input className="form-control" value={dns2} onChange={e => setDns2(e.target.value)} placeholder="8.8.4.4" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Reallocate ID ────────────────────────────── */
export function ReallocateIdModal({ open, ontId, onClose }) {
  const [newId, setNewId] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!newId) { toast.error('Enter new ONU ID'); return; }
    setBusy(true);
    try { await ontAPI.reallocateId(ontId, { newOnuId: parseInt(newId) }); toast.success('ONU ID reallocated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Change allocated ONU ID" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">New ONU ID</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={1} value={newId} onChange={e => setNewId(e.target.value)} />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── GPON Channel ─────────────────────────────── */
export function GPONChannelModal({ open, ontId, onClose }) {
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!profile) { toast.error('Select a profile'); return; }
    setBusy(true);
    try { await ontAPI.gponChannel(ontId, { lineProfileId: parseInt(profile) }); toast.success('GPON channel updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update GPON channel" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Line profile ID</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={1} value={profile} onChange={e => setProfile(e.target.value)} placeholder="Profile ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── VoIP ──────────────────────────────────────── */
export function VoIPModal({ open, ontId, onClose }) {
  const [enabled, setEnabled] = useState(true);
  const [server, setServer] = useState('');
  const [port, setPort] = useState('5060');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await ontAPI.voip(ontId, { server, port, user, password: pass });
      } else {
        await ontAPI.disableVoip(ontId);
      }
      toast.success(enabled ? 'VoIP enabled' : 'VoIP disabled');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="VoIP service" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} saveLabel="Save" />}>
      <div className="form-group">
        <div className="col-sm-offset-4 col-sm-6">
          <label className="checkbox-inline">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Enable VoIP
          </label>
        </div>
      </div>
      {enabled && (
        <>
          <div className="form-group">
            <label className="control-label col-sm-4">SIP server</label>
            <div className="col-sm-6">
              <input className="form-control" value={server} onChange={e => setServer(e.target.value)} placeholder="sip.example.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label col-sm-4">SIP port</label>
            <div className="col-sm-6">
              <input className="form-control" value={port} onChange={e => setPort(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label col-sm-4">SIP user</label>
            <div className="col-sm-6">
              <input className="form-control" value={user} onChange={e => setUser(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label col-sm-4">SIP password</label>
            <div className="col-sm-6">
              <input className="form-control" value={pass} onChange={e => setPass(e.target.value)} type="password" />
            </div>
          </div>
        </>
      )}
    </ModalFrame>
  );
}

/* ─── IPTV ──────────────────────────────────────── */
export function IPTVModal({ open, ontId, onClose }) {
  const [vlan, setVlan] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!vlan) { toast.error('Enter VLAN ID'); return; }
    setBusy(true);
    try { await ontAPI.updateIPTV(ontId, { vlanId: vlan }); toast.success('IPTV updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Update IPTV" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">VLAN-ID</label>
        <div className="col-sm-6">
          <input className="form-control" value={vlan} onChange={e => setVlan(e.target.value)} placeholder="VLAN ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── TR069 Profile ────────────────────────────── */
export function TR069ProfileModal({ open, ontId, onClose }) {
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!profile) { toast.error('Select a profile'); return; }
    setBusy(true);
    try { await ontAPI.tr069Profile(ontId, { profileId: profile }); toast.success('TR069 profile updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="TR069 Profile" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Profile ID</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={1} value={profile} onChange={e => setProfile(e.target.value)} placeholder="Profile ID" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Firmware Upgrade ──────────────────────────── */
export function FirmwareUpgradeModal({ open, ontId, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.firmwareUpgrade(ontId, {}); toast.success('Firmware upgrade started'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Firmware Upgrade - Reset to defaults" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} saveLabel="Upgrade" />}>
      <p style={{ fontSize: 13 }}>
        After the firmware upgrade, the ONU will boot with factory default settings.
        All existing settings will be lost.
        The settings performed in SmartOLT will be preserved.
        Are you sure you want to upgrade the firmware now?
      </p>
    </ModalFrame>
  );
}

/* ─── Move ONU ─────────────────────────────────── */
export function MoveOnuModal({ open, ontId, onClose }) {
  const [oltId, setOltId] = useState('');
  const [board, setBoard] = useState('');
  const [port, setPort] = useState('');
  const [onuId, setOnuId] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!oltId || !board || !port) { toast.error('Fill in target OLT, board and port'); return; }
    setBusy(true);
    try { await ontAPI.move(ontId, { oltId: parseInt(oltId), board: parseInt(board), port: parseInt(port), onuId: onuId ? parseInt(onuId) : undefined }); toast.success('ONU moved'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <ModalFrame title="Move ONU" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={save} busy={busy} />}>
      <div className="form-group">
        <label className="control-label col-sm-4">Target OLT ID</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={1} value={oltId} onChange={e => setOltId(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Board</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={0} value={board} onChange={e => setBoard(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Port</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={0} value={port} onChange={e => setPort(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">New ONU ID</label>
        <div className="col-sm-6">
          <input className="form-control" type="number" min={1} value={onuId} onChange={e => setOnuId(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── TR069 Stat ────────────────────────────────── */
export async function fetchTR069Stat(ontId, setReadResult) {
  try {
    const r = await ontAPI.signal(ontId);
    setReadResult({ title: 'TR069 Stat', data: r.data?.data || r.data });
  } catch (e) {
    toast.error('Failed to fetch TR069 status');
  }
}
