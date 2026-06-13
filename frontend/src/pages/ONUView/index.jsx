import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconReload, IconTrash, IconExternalLink } from '@tabler/icons-react';
import { ontAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ExtIdModal,
  SpeedProfileModal,
  EthernetPortModal,
  WifiPortModal,
  WebUserPassModal,
  ReplaceBySNModal,
  UpdateModeModal,
  VLANModal,
  UpdateLocationModal,
  MgmtIPModal,
  ReallocateIdModal,
  GPONChannelModal,
  VoIPModal,
  IPTVModal,
  TR069ProfileModal,
  FirmwareUpgradeModal,
  MoveOnuModal,
  fetchTR069Stat,
} from './OnuModals';

function rxColor(rx) {
  if (rx == null) return 'inherit';
  return rx >= -20 ? '#5cb85c' : rx >= -24 ? '#5bc0de' : rx >= -27 ? '#e08a16' : '#d9534f';
}

function v(s) { return s ?? '—'; }

function ChangeOnuTypeModal({ open, ontId, onClose }) {
  const [typeId, setTypeId] = useState('');
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    if (!typeId) return;
    setBusy(true);
    try { await ontAPI.changeType(ontId, { onuTypeId: typeId }); toast.success('ONU type changed'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal onu-ui-modal-dropdowns" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>Change ONU type</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="control-label col-sm-4">ONU type</label>
                <div className="col-sm-6">
                  <input className="form-control" value={typeId} onChange={e => setTypeId(e.target.value)} placeholder="ONU type ID" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>Close</a>
              <a href="#" className="btn btn-primary" onClick={handleSave}>{busy ? 'Changing…' : 'Change'}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GenericModal({ open, title, children, onClose, onSave, saveLabel, busy, danger }) {
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>{title}</h3>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>Close</a>
              {onSave && (
                <a href="#"
                  className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                  onClick={busy ? undefined : onSave}>
                  {busy ? 'Working…' : (saveLabel || 'Save')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfirmModal({ open, title, message, onClose, onConfirm, busy, danger }) {
  return (
    <GenericModal open={open} title={title || 'Confirm'} onClose={busy ? undefined : onClose} saveLabel="Yes" danger={danger} busy={busy} onSave={busy ? undefined : onConfirm}>
      <p style={{ fontSize: 13 }}>{message}</p>
    </GenericModal>
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

  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [readResult, setReadResult] = useState(null);

  const runAction = (name) => {
    const actions = {
      'Reboot': { confirm: true, msg: 'Reboot this ONU?', run: () => ontAPI.reboot(id) },
      'Enable ONU': { confirm: true, msg: 'Enable this ONU?', run: () => ontAPI.enable(id) },
      'Disable ONU': { confirm: true, danger: true, msg: 'Disable this ONU? It will lose service.', run: () => ontAPI.disable(id) },
      'Start ONU': { confirm: true, msg: 'Start (activate) this ONU?', run: () => ontAPI.start(id) },
      'Stop ONU': { confirm: true, danger: true, msg: 'Stop (deactivate) this ONU?', run: () => ontAPI.stop(id) },
      'Resync config': { confirm: true, msg: 'Recreate (resync) the OLT config for this ONU?', run: () => ontAPI.resync(id) },
      'Restore defaults': { confirm: true, danger: true, msg: 'Restore to factory defaults?', run: () => ontAPI.restoreDefaults(id) },
      'Delete': { confirm: true, danger: true, msg: 'Delete this ONU? Cannot be undone.', run: () => ontAPI.delete(id).then(() => { qc.invalidateQueries({ queryKey: ['onts'] }); navigate('/onts'); }) },
      'Firmware Upgrade - Reset to defaults': 'firmwareUpgrade',
    };
    const a = actions[name];
    if (!a) { setModal({ type: name }); return; }
    if (a.confirm) setModal({ type: 'confirm', name, ...a });
    else if (typeof a === 'string') setModal({ type: a, name });
  };

  const execConfirm = async (cfg) => {
    setBusy(true);
    try {
      await cfg.run();
      toast.success(`${cfg.name} OK`);
      qc.invalidateQueries({ queryKey: ['ont', id] });
      setModal(null);
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const o = ont || {};
  const name = o.client?.name || o.name || `ONU ${id}`;
  const isOnline = o.status === 'online';

  const m = (type) => modal?.type === type;

  return (
    <div className="container-fluid onu-wrapper">
      <h2>View ONU</h2>

      <div className="col-xs-12 col-sm-6">
        <dl className="dl-horizontal">

          <dt>
            OLT
            <Link to={`/onts?olt_id=${o.olt_id}`} className="margin-left pull-right" target="_blank">
              <IconExternalLink size={12} />
            </Link>
          </dt>
          <dd>
            <a href="#moveOnu" className="move-onu" onClick={() => runAction('Move ONU')}>
              {o.olt?.name || o.olt_name || `OLT #${o.olt_id}`}
            </a>
          </dd>

          <dt>
            Board
            <Link to={`/onts?olt_id=${o.olt_id}&board=${o.board}`} className="margin-left pull-right" target="_blank">
              <IconExternalLink size={12} />
            </Link>
          </dt>
          <dd>
            <a href="#moveOnu" className="move-onu" onClick={() => runAction('Move ONU')}>
              {v(o.board)}
            </a>
          </dd>

          <dt>
            Port
            <Link to={`/onts?olt_id=${o.olt_id}&board=${o.board}&port=${o.port}`} className="margin-left pull-right" target="_blank">
              <IconExternalLink size={12} />
            </Link>
          </dt>
          <dd>
            <a href="#moveOnu" className="move-onu" onClick={() => runAction('Move ONU')}>
              {v(o.port)}
            </a>
          </dd>

          <dt>ONU</dt>
          <dd>
            <a href="#changeAllocatedOnu" className="change-allocated-onu"
              onClick={() => setModal({ type: 'reallocateId' })}>
              {o.channel || 'gpon'}-onu_{o.board || '?'}/{o.port || '?'}:{o.onu_id || '?'}
            </a>
          </dd>

          <dt>GPON channel</dt>
          <dd>
            <a href="#updateGponType" className="update-gpon-type"
              onClick={() => setModal({ type: 'gponChannel' })}>
              GPON
            </a>
          </dd>

          <dt>SN</dt>
          <dd>
            <a href="#updateSN" className="update-sn"
              onClick={() => setModal({ type: 'replaceBySN' })}>
              {v(o.serial_number || o.sn || o.mac)}
            </a>
          </dd>

          <dt>
            ONU type
            <Link to={`/onts?onu_type_id=${o.onu_type_id}`} className="margin-left pull-right" target="_blank">
              <IconExternalLink size={12} />
            </Link>
          </dt>
          <dd>
            <a href="#changeOnuType" className="change-onu-type"
              onClick={() => setModal({ type: 'changeOnuType' })}>
              {v(o.onu_type || o.model)}
            </a>
          </dd>

          <dt>
            Zone
            <Link to={`/onts?zone_id=${o.zone_id}`} className="margin-left pull-right" target="_blank">
              <IconExternalLink size={12} />
            </Link>
          </dt>
          <dd>
            <a href="#updateLocationDetails" className="update-location-details"
              onClick={() => setModal({ type: 'updateLocation' })}>
              {v(o.zone?.name || o.zone)}
            </a>
          </dd>

          <dt>ODB (Splitter)</dt>
          <dd>
            <a href="#updateLocationDetails" className="update-location-details"
              onClick={() => setModal({ type: 'updateLocation' })}>
              {v(o.odb?.name || o.odb)}
            </a>
          </dd>

          <dt>Name</dt>
          <dd>
            <a href="#updateLocationDetails" className="update-location-details"
              onClick={() => setModal({ type: 'updateLocation' })}>
              {name}
            </a>
          </dd>

          <dt>Address or comment</dt>
          <dd>
            <a href="#updateLocationDetails" className="update-location-details"
              onClick={() => setModal({ type: 'updateLocation' })}>
              {v(o.client?.address || o.address)}
            </a>
          </dd>

          <dt>Contact</dt>
          <dd>
            <a href="#updateLocationDetails" className="update-location-details"
              onClick={() => setModal({ type: 'updateLocation' })}>
              {v(o.client?.phone || o.contact)}
            </a>
          </dd>

          <dt>Authorization date</dt>
          <dd>
            <span>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</span>
            <a href="#historyModal" className="history margin-left" onClick={() => toast('History — próximamente', { icon: '⚙️' })}>History</a>
          </dd>

          <dt>ONU external ID</dt>
          <dd>
            <a href="#updateClientExternalId" className="update-client-external-id"
              onClick={() => setModal({ type: 'extId' })}>
              {v(o.external_id)}
            </a>
          </dd>

          <dt>Firmware</dt>
          <dd><span className="text-muted">{v(o.firmware || o.sw_version)}</span></dd>

          <dt>Line profile</dt>
          <dd><span className="text-muted">{v(o.line_profile)}</span></dd>

          <dt>Service profile</dt>
          <dd><span className="text-muted">{v(o.srv_profile)}</span></dd>

        </dl>
      </div>

      <div className="col-xs-12 col-sm-6">
        <div className="equipment">
          <img className="img-responsive img-rounded"
            src="/content/img/4_eth_0_voip_0_catv.png"
            alt="ONU equipment"
            style={{ maxHeight: 80, filter: 'grayscale(0.5)', opacity: 0.7 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        <dl className="dl-horizontal">
          <dt>Status</dt>
          <dd id="onu_status_wrapper">
            <span style={{ color: isOnline ? '#5cb85c' : '#98989D', fontWeight: 600 }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {o.uptime ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>({o.uptime})</span> : null}
          </dd>

          <dt>Last down cause</dt>
          <dd><span className="text-muted">{v(o.last_down_cause)}</span></dd>

          <dt>ONU/OLT Rx signal</dt>
          <dd id="signal_wrapper">
            <span style={{ color: rxColor(o.rx_power) }}>{o.rx_power != null ? `${o.rx_power} dBm` : '—'}</span>
            {o.olt_rx != null ? <span className="text-muted"> / {o.olt_rx} dBm</span> : null}
            {o.distance != null ? <span className="text-muted"> ({o.distance}m)</span> : null}
          </dd>

          <dt>Attached VLANs</dt>
          <dd>
            <a href="#updateVlans" className="update-vlans"
              onClick={() => setModal({ type: 'vlan' })}>
              {v(o.vlan_id || o.vlan)}
            </a>
          </dd>

          <dt>ONU mode</dt>
          <dd>
            <a href="#updateMode" className="update-mode"
              onClick={() => setModal({ type: 'updateMode' })}>
              {v(o.mode || 'Routing')} - WAN vlan: {v(o.vlan_id || o.vlan)}
            </a>
          </dd>

          <dt className="mgmtIPModeItem">TR069</dt>
          <dd className="mgmtIPModeItem">
            <a href="#updateMgmtIP" className="update-mgmtIP"
              onClick={() => setModal({ type: 'tr069Profile' })}>
              {o.tr069_enabled ? 'SmartOLT' : 'Disabled'}
            </a>
          </dd>

          <dt className="mgmtIPModeItem">Mgmt IP</dt>
          <dd className="mgmtIPModeItem">
            <a href="#updateMgmtIP" className="update-mgmtIP"
              onClick={() => setModal({ type: 'mgmtIP' })}>
              {o.mgmt_ip_mode || 'Static'} - vlan: {o.mgmt_ip_vlan_id || '—'}
            </a>
            {o.mgmt_ip ? <span className="text-muted"> — {o.mgmt_ip}</span> : null}
          </dd>

          <dt className="routerModeItem">WAN setup mode</dt>
          <dd className="routerModeItem">
            <a href="#updateMode" className="update-mode onuRouterMode"
              onClick={() => setModal({ type: 'updateMode' })}>
              {o.wan_mode || 'PPPoE'} ({o.config_method || 'TR069'})
            </a>
          </dd>

          <dt className="routerModeItem pppoeItem">PPPoE username</dt>
          <dd className="routerModeItem pppoeItem">
            <span className="hidden_pppoe_username margin-right">{o.pppoe_user ? '**********' : '—'}</span>
          </dd>

          <dt className="routerModeItem pppoeItem">PPPoE password</dt>
          <dd className="routerModeItem pppoeItem">
            <span className="hidden_pppoe_password margin-right">{o.pppoe_pass ? '**********' : '—'}</span>
          </dd>
        </dl>
      </div>

      <dl className="dl-horizontal col-xs-12 col-sm-12">
        <dt>Status</dt>
        <dd>
          <button className="btn btn-success margin-bottom status_buttons" onClick={async () => {
            try { const r = await ontAPI.signal(id); setReadResult({ title: 'ONU status', data: r.data?.data || r.data }); }
            catch (e) { toast.error('Failed'); }
          }}>Get status</button>

          <button className="btn btn-success margin-bottom status_buttons" onClick={async () => {
            try { const r = await ontAPI.runningConfig(id); setReadResult({ title: 'Running config', data: r.data?.data || r.data }); }
            catch (e) { toast.error('Failed'); }
          }}>Show running-config</button>

          <button className="btn btn-success margin-bottom status_buttons" onClick={async () => {
            try { const r = await ontAPI.swInfo(id); setReadResult({ title: 'SW info', data: r.data?.data || r.data }); }
            catch (e) { toast.error('Failed'); }
          }}>SW info</button>

          <button className="btn btn-success margin-bottom status_buttons"
            onClick={() => fetchTR069Stat(id, setReadResult)}>
            TR069 Stat
          </button>

          <button className="btn btn-success margin-bottom live"
            style={{ backgroundColor: '#1fb325', borderColor: '#1fb325' }}
            onClick={() => toast('LIVE! — próximamente', { icon: '⚙️' })}>
            LIVE!
          </button>

          <pre id="status" className="hidden status_container text-wrap" />
          <div id="status_tr69" className="status_container hidden" />
        </dd>

        <dt style={{ marginBottom: 5 }} />
        <dd />

        <dt>Traffic/Signal</dt>
        <dd>
          <div className="graphs-container" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            <div className="graph-item" style={{
              flex: '0 1 calc(50% - 8px)', minWidth: 'min(100%, 360px)', maxWidth: '100%',
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 8px 6px',
            }}>
              <iframe src={`/onts/${id}/traffic`} style={{ width: '100%', height: 200, border: 'none' }}
                title="Traffic graph" />
            </div>
            <div className="graph-item" style={{
              flex: '0 1 calc(50% - 8px)', minWidth: 'min(100%, 360px)', maxWidth: '100%',
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 8px 6px',
            }}>
              <iframe src={`/onts/${id}/signal`} style={{ width: '100%', height: 200, border: 'none' }}
                title="Signal graph" />
            </div>
          </div>
        </dd>

        <dt>Speed profiles</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <thead>
              <tr>
                <th>Service-port ID</th>
                <th>SVLAN</th>
                <th>User-VLAN</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(o.service_ports || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No service ports configured</td></tr>
              ) : (o.service_ports || []).map(sp => (
                <tr className="valign-center" key={sp.id || sp.service_port_id}>
                  <td>{sp.service_port_id || sp.id}</td>
                  <td>{sp.svlan || ''}</td>
                  <td>{sp.user_vlan || sp.vlan}</td>
                  <td>{sp.download || sp.download_speed}</td>
                  <td>{sp.upload || sp.upload_speed}</td>
                  <td>
                    <a href="#updateSpeedProfiles" className="btn btn-link update-speed-profiles"
                      onClick={() => setModal({ type: 'speedProfile' })}>
                      <i className="glyphicon glyphicon-plus-sign" /> Configure
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

        <dt>Ethernet ports</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <thead>
              <tr>
                <th className="col-md-1">Port</th>
                <th className="col-md-1">Admin state</th>
                <th className="col-md-3">Mode</th>
                <th className="col-md-1">DHCP</th>
                <th className="col-md-1 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {(o.eth_ports || [{ port: 'eth_0/1' }, { port: 'eth_0/2' }, { port: 'eth_0/3' }, { port: 'eth_0/4' }]).map(ep => (
                <tr className="valign-center" key={ep.port}>
                  <td>{ep.port}</td>
                  <td>{ep.admin_state || ep.state === 1 ? 'Enabled' : 'Disabled'}</td>
                  <td>{ep.mode || 'LAN'}</td>
                  <td>{ep.dhcp || 'No control'}</td>
                  <td>
                    <a href="#configureNetworkPort" className="btn btn-link configure-vlan"
                      onClick={() => setModal({ type: 'ethPort' })}>
                      <i className="glyphicon glyphicon-plus-sign" /> Configure
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

        <dt>WiFi ports</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <thead>
              <tr>
                <th className="col-md-1">Port</th>
                <th className="col-md-1">Admin state</th>
                <th className="col-md-2">Mode</th>
                <th className="col-md-2">SSID</th>
                <th className="col-md-1">DHCP</th>
                <th className="col-md-1 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {(o.wifi_ports || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No WiFi ports configured</td></tr>
              ) : (o.wifi_ports || []).map(wp => (
                <tr className="valign-center" key={wp.port}>
                  <td>{wp.port}</td>
                  <td>{wp.admin_state || 'Enabled'}</td>
                  <td>{wp.mode || 'Access point'}</td>
                  <td>{wp.ssid || '—'}</td>
                  <td>{wp.dhcp || 'No control'}</td>
                  <td>
                    <a href="#configureWifiPort" className="btn btn-link configure-wifi"
                      onClick={() => setModal({ type: 'wifiPort' })}>
                      <i className="glyphicon glyphicon-plus-sign" /> Configure
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

        <br />
        <dt />
        <dd>
          <div className="form-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="#rebootModal" className="btn btn-warning margin-bottom"
              onClick={() => runAction('Reboot')}>
              <IconReload size={14} style={{ marginRight: 4 }} /> Reboot
            </a>
            <a href="#rebuildModal" className="btn btn-warning margin-bottom"
              style={{ backgroundColor: '#f0ad4e', borderColor: '#eea236', color: '#333' }}
              onClick={() => runAction('Resync config')}>
              <IconReload size={14} style={{ marginRight: 4 }} /> Resync config
            </a>
            <a href="#restoreFDModal" className="btn btn-warning margin-bottom"
              style={{ backgroundColor: '#f0ad4e', borderColor: '#eea236', color: '#333' }}
              onClick={() => runAction('Restore defaults')}>
              <IconReload size={14} style={{ marginRight: 4 }} /> Restore defaults
            </a>
            <a href="#disableModal" className="btn btn-warning margin-bottom"
              onClick={() => runAction('Disable ONU')}>
              Disable ONU
            </a>
            <a href="#deleteModal" className="btn btn-danger margin-bottom"
              onClick={() => runAction('Delete')}>
              <IconTrash size={14} style={{ marginRight: 4 }} /> Delete
            </a>
          </div>
        </dd>
      </dl>

      {/* ── Modals ── */}
      <ChangeOnuTypeModal
        open={m('changeOnuType')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <ExtIdModal
        open={m('extId')}
        ontId={id}
        current={o.external_id}
        onClose={() => setModal(null)}
      />

      <SpeedProfileModal
        open={m('speedProfile')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <EthernetPortModal
        open={m('ethPort')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <WifiPortModal
        open={m('wifiPort')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <WebUserPassModal
        open={m('webPass')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <ReplaceBySNModal
        open={m('replaceBySN')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <UpdateModeModal
        open={m('updateMode')}
        ontId={id}
        current={o}
        onClose={() => setModal(null)}
      />

      <VLANModal
        open={m('vlan')}
        ontId={id}
        current={o}
        onClose={() => setModal(null)}
      />

      <UpdateLocationModal
        open={m('updateLocation')}
        ontId={id}
        current={o}
        onClose={() => setModal(null)}
      />

      <MgmtIPModal
        open={m('mgmtIP')}
        ontId={id}
        current={o}
        onClose={() => setModal(null)}
      />

      <ReallocateIdModal
        open={m('reallocateId')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <GPONChannelModal
        open={m('gponChannel')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <VoIPModal
        open={m('VoIP service')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <IPTVModal
        open={m('Update IPTV')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <TR069ProfileModal
        open={m('TR069 Profile')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <FirmwareUpgradeModal
        open={m('firmwareUpgrade')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <MoveOnuModal
        open={m('Move ONU')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      {modal?.type === 'confirm' && (
        <ConfirmModal
          open
          title={modal.name}
          message={modal.msg}
          danger={modal.danger}
          busy={busy}
          onClose={() => !busy && setModal(null)}
          onConfirm={() => execConfirm(modal)}
        />
      )}

      {readResult && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.65)',
        }} onClick={(e) => { if (e.target === e.currentTarget) setReadResult(null); }}>
          <div style={{
            width: 640, maxWidth: '92vw', maxHeight: '85vh', overflow: 'auto',
            background: 'var(--sidebar-bg)', border: '1px solid var(--border-light)', borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{readResult.title}</span>
              <button className="close" onClick={() => setReadResult(null)}>&times;</button>
            </div>
            <pre style={{
              padding: 16, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text-secondary)', margin: 0,
            }}>
              {typeof readResult.data === 'string' ? readResult.data : JSON.stringify(readResult.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}
