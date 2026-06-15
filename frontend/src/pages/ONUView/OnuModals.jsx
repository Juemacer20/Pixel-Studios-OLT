import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { ontAPI, graphsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [svlan, setSvlan] = useState('');
  const [cvlan, setCvlan] = useState('');
  const [tagTransform, setTagTransform] = useState('N/A');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!download || !upload) { toast.error('Select download and upload speeds'); return; }
    setBusy(true);
    try { await ontAPI.speedProfile(ontId, { downloadSpeed: download, uploadSpeed: upload, vlanId: vlan, svlan, cvlan, tagTransform }); toast.success('Speed profile updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  const handleRemove = async () => {
    setRemoving(true);
    try { await ontAPI.removeSpeedProfile(ontId); toast.success('Service port removed'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setRemoving(false); }
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
      <div className="form-group">
        <label className="control-label col-sm-4">SVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={svlan} onChange={e => setSvlan(e.target.value)} placeholder="SVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">CVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={cvlan} onChange={e => setCvlan(e.target.value)} placeholder="CVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Tag transform</label>
        <div className="col-sm-6">
          <select className="form-control" value={tagTransform} onChange={e => setTagTransform(e.target.value)}>
            <option value="N/A">N/A</option>
            <option value="Translation">Translation</option>
            <option value="Transparent">Transparent</option>
            <option value="Tag">Tag</option>
            <option value="Untag">Untag</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <div className="col-sm-offset-4 col-sm-6">
          <a href="#" className="btn btn-danger btn-sm" onClick={handleRemove}>{removing ? 'Removing…' : 'Remove service port'}</a>
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
  const [configMethod, setConfigMethod] = useState(current?.config_method || 'PPPoE');
  const [ipProtocol, setIpProtocol] = useState(current?.ip_protocol || 'IPv4');
  const [ipv6Prefix, setIpv6Prefix] = useState(current?.ipv6_prefix || '');
  const [remoteAccess, setRemoteAccess] = useState(current?.remote_access || false);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try { await ontAPI.updateMode(ontId, { mode, wanMode, pppoeUser, pppoePass, vlanId: vlan, configMethod, ipProtocol, ipv6Prefix, remoteAccess }); toast.success('ONU mode updated'); onClose(); }
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
        <label className="control-label col-sm-4">Config method</label>
        <div className="col-sm-6">
          <select className="form-control" value={configMethod} onChange={e => setConfigMethod(e.target.value)}>
            <option value="PPPoE">PPPoE</option>
            <option value="DHCP">DHCP</option>
            <option value="Static">Static IP</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">IP protocol</label>
        <div className="col-sm-6">
          <select className="form-control" value={ipProtocol} onChange={e => setIpProtocol(e.target.value)}>
            <option value="IPv4">IPv4</option>
            <option value="IPv6">IPv6</option>
            <option value="IPv4v6">IPv4v6</option>
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
      <div className="form-group">
        <label className="control-label col-sm-4">IPv6 prefix</label>
        <div className="col-sm-6">
          <input className="form-control" value={ipv6Prefix} onChange={e => setIpv6Prefix(e.target.value)} placeholder="2001:db8::/48" />
        </div>
      </div>
      <div className="form-group">
        <div className="col-sm-offset-4 col-sm-6">
          <label className="checkbox-inline">
            <input type="checkbox" checked={remoteAccess} onChange={e => setRemoteAccess(e.target.checked)} /> WAN remote access
          </label>
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
  const [lat, setLat] = useState(current?.latitude || '');
  const [lng, setLng] = useState(current?.longitude || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const handleGeo = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); },
      () => toast.error('Geolocation failed'),
    );
  };
  const save = async () => {
    setBusy(true);
    try { await ontAPI.updateLocationDetails(ontId, { zone, odb, address, contact, latitude: lat, longitude: lng }); toast.success('Location updated'); onClose(); }
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
      <div className="form-group">
        <label className="control-label col-sm-4">Latitude</label>
        <div className="col-sm-6">
          <input className="form-control" value={lat} onChange={e => setLat(e.target.value)} placeholder="-34.603722" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Longitude</label>
        <div className="col-sm-6">
          <input className="form-control" value={lng} onChange={e => setLng(e.target.value)} placeholder="-58.381592" />
        </div>
      </div>
      <div className="form-group">
        <div className="col-sm-offset-4 col-sm-6">
          <a href="#" className="btn btn-default btn-sm" onClick={handleGeo}>Use current location</a>
        </div>
      </div>
      {lat && lng && (
        <div className="form-group">
          <div className="col-sm-offset-4 col-sm-6">
            <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
              target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm">
              Open in OpenStreetMap
            </a>
          </div>
        </div>
      )}
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
  const [svlan, setSvlan] = useState(current?.mgmt_ip_svlan || '');
  const [cvlan, setCvlan] = useState(current?.mgmt_ip_cvlan || '');
  const [tagTransform, setTagTransform] = useState(current?.mgmt_ip_tag_transform || 'N/A');
  const [tr069Profile, setTr069Profile] = useState(current?.tr069_profile || '');
  const [sipServer, setSipServer] = useState(current?.sip_server || '');
  const [sipPort, setSipPort] = useState(current?.sip_port || '5060');
  const [sipUser, setSipUser] = useState(current?.sip_user || '');
  const [sipPass, setSipPass] = useState(current?.sip_pass || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    try {
      await ontAPI.updateMgmtIP(ontId, {
        ipAddress: ip, subnetMask: mask, defaultGateway: gateway, dns1, dns2, vlanId: vlan,
        svlan, cvlan, tagTransform, tr069Profile,
        sipServer, sipPort, sipUser, sipPassword: sipPass,
      });
      toast.success('Mgmt IP updated'); onClose();
    }
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
      <div className="form-group">
        <label className="control-label col-sm-4">SVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={svlan} onChange={e => setSvlan(e.target.value)} placeholder="SVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">CVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={cvlan} onChange={e => setCvlan(e.target.value)} placeholder="CVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Tag transform</label>
        <div className="col-sm-6">
          <select className="form-control" value={tagTransform} onChange={e => setTagTransform(e.target.value)}>
            <option value="N/A">N/A</option>
            <option value="Translation">Translation</option>
            <option value="Transparent">Transparent</option>
            <option value="Tag">Tag</option>
            <option value="Untag">Untag</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">TR069 profile</label>
        <div className="col-sm-6">
          <input className="form-control" value={tr069Profile} onChange={e => setTr069Profile(e.target.value)} placeholder="Profile ID" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">SIP server</label>
        <div className="col-sm-6">
          <input className="form-control" value={sipServer} onChange={e => setSipServer(e.target.value)} placeholder="sip.example.com" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">SIP port</label>
        <div className="col-sm-6">
          <input className="form-control" value={sipPort} onChange={e => setSipPort(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">SIP user</label>
        <div className="col-sm-6">
          <input className="form-control" value={sipUser} onChange={e => setSipUser(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">SIP password</label>
        <div className="col-sm-6">
          <input className="form-control" value={sipPass} onChange={e => setSipPass(e.target.value)} type="password" />
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
  const [svlan, setSvlan] = useState('');
  const [cvlan, setCvlan] = useState('');
  const [tagTransform, setTagTransform] = useState('N/A');
  const [download, setDownload] = useState('');
  const [upload, setUpload] = useState('');
  const [radioVlan, setRadioVlan] = useState('');
  const [radioSvlan, setRadioSvlan] = useState('');
  const [radioEnabled, setRadioEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!vlan) { toast.error('Enter VLAN ID'); return; }
    setBusy(true);
    try {
      await ontAPI.updateIPTV(ontId, {
        vlanId: vlan, svlan, cvlan, tagTransform,
        downloadSpeed: download, uploadSpeed: upload,
        radioVlan, radioSvlan, radioEnabled,
      });
      toast.success('IPTV updated'); onClose();
    }
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
      <div className="form-group">
        <label className="control-label col-sm-4">SVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={svlan} onChange={e => setSvlan(e.target.value)} placeholder="SVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">CVLAN</label>
        <div className="col-sm-6">
          <input className="form-control" value={cvlan} onChange={e => setCvlan(e.target.value)} placeholder="CVLAN" />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label col-sm-4">Tag transform</label>
        <div className="col-sm-6">
          <select className="form-control" value={tagTransform} onChange={e => setTagTransform(e.target.value)}>
            <option value="N/A">N/A</option>
            <option value="Translation">Translation</option>
            <option value="Transparent">Transparent</option>
            <option value="Tag">Tag</option>
            <option value="Untag">Untag</option>
          </select>
        </div>
      </div>
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
      <h4>Radio (satellite)</h4>
      <div className="form-group">
        <div className="col-sm-offset-4 col-sm-6">
          <label className="checkbox-inline">
            <input type="checkbox" checked={radioEnabled} onChange={e => setRadioEnabled(e.target.checked)} /> Enable radio
          </label>
        </div>
      </div>
      {radioEnabled && (
        <>
          <div className="form-group">
            <label className="control-label col-sm-4">Radio VLAN-ID</label>
            <div className="col-sm-6">
              <input className="form-control" value={radioVlan} onChange={e => setRadioVlan(e.target.value)} placeholder="VLAN ID" />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label col-sm-4">Radio SVLAN</label>
            <div className="col-sm-6">
              <input className="form-control" value={radioSvlan} onChange={e => setRadioSvlan(e.target.value)} placeholder="SVLAN" />
            </div>
          </div>
        </>
      )}
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

/* ─── History Modal ──────────────────────────────── */
export function HistoryModal({ open, ontId, ontName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ontAPI.auditLog(ontId).then(r => setLogs(r.data?.data || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [open, ontId]);
  if (!open) return null;
  return (
    <ModalFrame title={`History — ${ontName}`} onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={null} />}>
      {loading ? <p style={{ fontSize: 13 }}>Loading...</p> : logs.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No history entries found</p>
      ) : (
        <table className="table table-bordered table-condensed" style={{ fontSize: 12 }}>
          <thead><tr><th>Date</th><th>Action</th><th>User</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                <td>{log.action}</td>
                <td>{log.user_id || '—'}</td>
                <td>{log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalFrame>
  );
}

/* ─── Live Signal Modal ──────────────────────────── */
export function LiveSignalModal({ open, ontId, onClose }) {
  const [live, setLive] = useState({ rx: '—', tx: '—', oltRx: '—', dist: '—', updated: null });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const histFetched = useRef(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    histFetched.current = false;

    ontAPI.signalHistory(ontId, '1h').then(r => {
      const h = (r.data?.data?.history || r.data?.history || r.data?.data || r.data || []);
      const arr = Array.isArray(h) ? h : [];
      setHistory(arr.map(p => ({ t: new Date(p.timestamp).getTime(), rx: p.rx_power, tx: p.tx_power })));
      setLoading(false);
      histFetched.current = true;
    }).catch(() => { setLoading(false); histFetched.current = true; });

    const fetchLive = () => ontAPI.signal(ontId).then(r => {
      const d = r.data?.data || r.data;
      setLive({ rx: d.rx_power, tx: d.tx_power, oltRx: d.olt_rx_power, dist: d.distance, updated: Date.now() });
      if (d.rx_power != null || d.tx_power != null) {
        setHistory(prev => {
          if (!histFetched.current) return prev;
          const last = prev.length ? prev[prev.length - 1] : null;
          if (last && Date.now() - last.t < 1500) return prev;
          return [...prev.slice(-300), { t: Date.now(), rx: d.rx_power, tx: d.tx_power }];
        });
      }
    }).catch(() => {});

    fetchLive();
    const iv = setInterval(fetchLive, 2000);
    return () => clearInterval(iv);
  }, [open, ontId]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <ModalFrame title={<span><span style={{ color: '#1fb325', animation: 'pulse-green 1.5s infinite' }}>●</span> LIVE! — Signal monitoring</span>}
      onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={null} saveLabel="Close" />}>
      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <span><strong>RX:</strong> {live.rx != null ? `${live.rx} dBm` : '—'}</span>
        <span><strong>TX:</strong> {live.tx != null ? `${live.tx} dBm` : '—'}</span>
        <span><strong>OLT Rx:</strong> {live.oltRx != null ? `${live.oltRx} dBm` : '—'}</span>
        <span><strong>Distance:</strong> {live.dist != null ? `${live.dist} m` : '—'}</span>
        {live.updated && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Updated {formatTime(live.updated)}</span>}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading signal history...</p>
      ) : history.length > 1 ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.12)" />
              <XAxis dataKey="t" tickFormatter={formatTime} stroke="var(--text-muted)" fontSize={10} />
              <YAxis stroke="var(--text-muted)" fontSize={10} unit=" dBm" domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                labelFormatter={formatTime}
              />
              <Line type="monotone" dataKey="rx" stroke="#5cb85c" name="RX" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="tx" stroke="#f0ad4e" name="TX" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Collecting signal data…</p>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Auto-refreshes every 2s</p>
    </ModalFrame>
  );
}

/* ─── More Graphs Modal ──────────────────────────── */
export function MoreGraphsModal({ open, ontId, onClose }) {
  const [range, setRange] = useState('24h');
  if (!open) return null;

  return (
    <ModalFrame title="Signal & Traffic graphs" onClose={onClose}
      footer={<SaveFooter onClose={onClose} onSave={null} saveLabel="Close" />}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Range:</span>
        {['1h', '24h', '7d', '30d'].map(r => (
          <button key={r}
            className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-default'}`}
            style={{ fontSize: 11, padding: '3px 10px' }}
            onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
            <span style={{ color: '#34C759' }}>●</span> RX <span style={{ color: '#FF9500' }}>●</span> TX
          </div>
          <SignalChartRange ontId={ontId} range={range} height={220} />
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
            <span style={{ color: '#5AC8FA' }}>●</span> Down <span style={{ color: '#FF9500' }}>●</span> Up
          </div>
          <TrafficChart ontId={ontId} height={220} />
        </div>
      </div>
    </ModalFrame>
  );
}

/* ─── Signal Chart (inline Recharts, no iframe) ─── */
function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function SignalChart({ ontId, height = 200 }) {
  const { data, isLoading } = useQuery({
    queryKey: ['signal-chart', ontId],
    queryFn: () => graphsAPI.signalOnt(ontId).then(r => r.data?.data || r.data),
    refetchInterval: 60000,
  });
  if (isLoading) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading signal…</div>;
  const history = data?.history || [];
  const points = history.map(p => ({ t: new Date(p.timestamp).getTime(), rx: p.rx_power, tx: p.tx_power })).filter(p => p.rx != null || p.tx != null);
  if (points.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No signal data</div>;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.12)" />
          <XAxis dataKey="t" tickFormatter={fmtTime} stroke="var(--text-muted)" fontSize={10} />
          <YAxis stroke="var(--text-muted)" fontSize={10} unit=" dBm" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelFormatter={fmtTime}
          />
          <Line type="monotone" dataKey="rx" stroke="#34C759" name="RX" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="tx" stroke="#FF9500" name="TX" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Traffic Chart (inline Recharts, no iframe) ─── */
export function TrafficChart({ ontId, height = 200 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ontId) return;
    setLoading(true);
    graphsAPI.trafficOnt(ontId, { range: '24h' }).then(r => {
      const d = r.data?.data || r.data;
      setData((Array.isArray(d) ? d : d?.history) || []);
    }).catch(() => setData([])).finally(() => setLoading(false));
  }, [ontId]);
  if (loading) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading traffic…</div>;
  const hist = Array.isArray(data) ? data : (data?.history || []);
  const points = hist.map(p => ({ t: new Date(p.timestamp || p.t).getTime(), rx: p.rx_mbps || p.rx, tx: p.tx_mbps || p.tx })).filter(p => p.rx != null || p.tx != null);
  if (points.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No traffic data</div>;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.12)" />
          <XAxis dataKey="t" tickFormatter={fmtTime} stroke="var(--text-muted)" fontSize={10} />
          <YAxis stroke="var(--text-muted)" fontSize={10} unit=" Mbps" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelFormatter={fmtTime}
          />
          <Line type="monotone" dataKey="rx" stroke="#5AC8FA" name="Down" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="tx" stroke="#FF9500" name="Up" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Combined graphs for MoreGraphsModal ──────── */
export function SignalChartRange({ ontId, range, height = 220 }) {
  const { data, isLoading } = useQuery({
    queryKey: ['signal-range', ontId, range],
    queryFn: () => ontAPI.signalHistory(ontId, range).then(r => r.data?.data || r.data),
    refetchInterval: 30000,
  });
  if (isLoading) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>;
  const points = (Array.isArray(data) ? data : (data?.history || data?.data || [])).map(p => ({ t: new Date(p.timestamp).getTime(), rx: p.rx_power, tx: p.tx_power })).filter(p => p.rx != null || p.tx != null);
  if (points.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No data</div>;
  const tickFmt = range === '30d' || range === '7d' ? fmtDate : fmtTime;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,160,200,0.12)" />
          <XAxis dataKey="t" tickFormatter={tickFmt} stroke="var(--text-muted)" fontSize={10} />
          <YAxis stroke="var(--text-muted)" fontSize={10} unit=" dBm" domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} labelFormatter={range === '30d' || range === '7d' ? (v) => new Date(v).toLocaleString() : fmtTime} />
          <Line type="monotone" dataKey="rx" stroke="#34C759" name="RX" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="tx" stroke="#FF9500" name="TX" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
