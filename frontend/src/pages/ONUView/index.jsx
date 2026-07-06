import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  HistoryModal,
  LiveSignalModal,
  MoreGraphsModal,
  SignalChart,
  TrafficChart,
  fetchTR069Stat,
} from './OnuModals';

function rxColor(rx) {
  if (rx == null) return 'inherit';
  return rx >= -20 ? '#5cb85c' : rx >= -24 ? '#5bc0de' : rx >= -27 ? '#e08a16' : '#d9534f';
}

function v(s) { return s ?? '—'; }

function ChangeOnuTypeModal({ open, ontId, onClose }) {
  const [typeId, setTypeId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    if (!typeId) return;
    setBusy(true);
    try { await ontAPI.changeType(ontId, { onuTypeId: typeId, customTemplateId: profileId || undefined }); toast.success('ONU type changed'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  const ONU_TYPES = ['HG8245H', 'HG8240H', 'HG8010H', 'EG8145V5', 'EG8141A5', 'HS8145V', 'VSOL', 'KT-AZUL', 'F601V6.0', 'GP1704-1G', 'GP1704-4GV-22A'];
  const PROFILES = ['Generic_1', 'Generic_2', 'Generic_3', 'Generic_4', 'Generic_5', 'Generic_6'];
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
                  <select className="form-control" value={typeId} onChange={e => setTypeId(e.target.value)}>
                    <option value="">— Select —</option>
                    {ONU_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="control-label col-sm-4">Custom template</label>
                <div className="col-sm-6">
                  <select className="form-control" value={profileId} onChange={e => setProfileId(e.target.value)}>
                    <option value="">None</option>
                    {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
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

function EPONChannelModal({ open, ontId, onClose }) {
  const [eponType, setEponType] = useState('epon');
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    setBusy(true);
    try { await ontAPI.eponChannel(ontId, { eponType }); toast.success('EPON channel updated'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>Update EPON channel</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="control-label col-sm-4">EPON type</label>
                <div className="col-sm-6">
                  <select className="form-control" value={eponType} onChange={e => setEponType(e.target.value)}>
                    <option value="epon">EPON</option>
                    <option value="epon_10g">10G-EPON</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>Close</a>
              <a href="#" className="btn btn-primary" onClick={handleSave}>{busy ? 'Updating…' : 'Update'}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SaveConfigModal({ open, onClose }) {
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    setBusy(true);
    try { await ontAPI.saveConfig(); toast.success('Configuration saved to OLT'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>Save Configuration</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                This will save the running configuration to the startup configuration on the OLT.
                All changes made to this ONU will be persisted across reboots.
              </p>
            </div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>Close</a>
              <a href="#" className="btn btn-primary" onClick={handleSave}>{busy ? 'Saving…' : 'Save'}</a>
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

function LiveSignalInline({ ontId }) {
  const [live, setLive] = useState({ rx: '—', tx: '—', oltRx: '—', dist: '—' });
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchLive = () => ontAPI.signal(ontId).then(r => {
      const d = r.data?.data || r.data;
      setLive({ rx: d.rx_power, tx: d.tx_power, oltRx: d.olt_rx_power, dist: d.distance });
      setChartData(prev => {
        const pt = { t: Date.now(), rx: d.rx_power, tx: d.tx_power };
        return [...prev.slice(-120), pt];
      });
    }).catch(() => {});
    fetchLive();
    const iv = setInterval(fetchLive, 2000);
    return () => clearInterval(iv);
  }, [ontId]);

  useEffect(() => {
    if (!canvasRef.current || chartData.length < 2) return;
    const Chart = window.Chart;
    if (!Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    const fmt = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; };
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.map(p => fmt(p.t)),
        datasets: [
          { label: 'RX', data: chartData.map(p => p.rx), borderColor: '#5cb85c', pointRadius: 0, borderWidth: 1.5, tension: 0.3 },
          { label: 'TX', data: chartData.map(p => p.tx), borderColor: '#f0ad4e', pointRadius: 0, borderWidth: 1.5, tension: 0.3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: true, ticks: { color: 'var(--text-muted)', font: { size: 9 }, maxTicksLimit: 6 }, grid: { display: false } },
          y: { display: true, ticks: { color: 'var(--text-muted)', font: { size: 9 }, callback: (v) => `${v} dBm` }, grid: { color: 'rgba(120,160,200,0.12)', drawBorder: false } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [chartData]);

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
        <span style={{ color: '#1fb325' }}>●</span> LIVE! — Signal monitoring (auto-refresh 2s)
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 8 }}>
        <span><strong>RX:</strong> {live.rx != null ? `${live.rx} dBm` : '—'}</span>
        <span><strong>TX:</strong> {live.tx != null ? `${live.tx} dBm` : '—'}</span>
        <span><strong>OLT Rx:</strong> {live.oltRx != null ? `${live.oltRx} dBm` : '—'}</span>
        <span><strong>Distance:</strong> {live.dist != null ? `${live.dist} m` : '—'}</span>
      </div>
      <div style={{ width: '100%', height: 160 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

export default function ONUView() {
  const { t } = useTranslation();
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
  const [refreshing, setRefreshing] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);

  const runAction = (name) => {
    const actions = {
      'Reboot': { confirm: true, msg: 'Reboot this ONU?', run: () => ontAPI.reboot(id) },
      'Enable ONU': { confirm: true, msg: 'Enable this ONU?', run: () => ontAPI.enable(id) },
      'Disable ONU': { confirm: true, danger: true, msg: 'Disable this ONU? It will lose service.', run: () => ontAPI.disable(id) },
      'Start ONU': { confirm: true, msg: 'Start (activate) this ONU?', run: () => ontAPI.start(id) },
      'Stop ONU': { confirm: true, danger: true, msg: 'Stop (deactivate) this ONU?', run: () => ontAPI.stop(id) },
      'Resync config': { confirm: true, msg: 'Recreate (resync) the OLT config for this ONU?', run: () => ontAPI.resync(id) },
      'Reset ONU': { confirm: true, danger: true, msg: 'Restore ONU to factory defaults? All settings will be lost.', run: () => ontAPI.restoreDefaults(id) },
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
      <h2>ONU — {name}</h2>

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
            <a href="#historyModal" className="history margin-left" onClick={() => setModal({ type: 'history' })}>History</a>
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
        <dl className="dl-horizontal">
          <dt>{t('onuView.status')}</dt>
          <dd id="onu_status_wrapper">
            <span style={{ color: isOnline ? '#5cb85c' : '#98989D', fontWeight: 600 }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {o.uptime ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>({o.uptime})</span> : null}
          </dd>

          <dt>Last down cause</dt>
          <dd><span className="text-muted">{v(o.last_down_cause)}</span></dd>

          <dt>Signal (Tx/Rx)</dt>
          <dd id="signal_wrapper">
            <span style={{ color: '#f0ad4e' }}>{o.tx_power != null ? `${o.tx_power} dBm` : '—'}</span>
            <span className="text-muted"> / </span>
            <span style={{ color: rxColor(o.rx_power) }}>{o.rx_power != null ? `${o.rx_power} dBm` : '—'}</span>
            {o.olt_rx != null ? <span className="text-muted"> (OLT: {o.olt_rx} dBm)</span> : null}
            {o.distance != null ? <span className="text-muted"> · {o.distance}m</span> : null}
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

          <dt className="mgmtIPModeItem">{t('onuView.general.tr069')}</dt>
          <dd className="mgmtIPModeItem">
            <a href="#updateMgmtIP" className="update-mgmtIP"
              onClick={() => setModal({ type: 'tr069Profile' })}>
              {o.tr069_enabled ? 'SmartOLT' : 'Disabled'}
            </a>
          </dd>

          <dt className="mgmtIPModeItem">{t('onuView.general.mgmtIp')}</dt>
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

          {o.wan_info && o.wan_info.length > 0 ? (
            <>
              <dt style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>{t('onuView.wan.title')}</dt>
              <dd style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                {o.wan_info.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: i < o.wan_info.length - 1 ? 6 : 0, paddingBottom: i < o.wan_info.length - 1 ? 6 : 0, borderBottom: i < o.wan_info.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                    <div><strong>{w.name || `WAN ${w.index}`}</strong> <span className="text-muted">({w.service_type})</span></div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                      <span className="text-muted">{w.ipv4_access || w.ipv4_access_type} · {w.connection_type}</span>
                      {w.ipv4_status ? <span className={`badge ${w.ipv4_status === 'Connected' ? 'badge-green' : ''}`} style={{ fontSize: 10 }}>{w.ipv4_status}</span> : null}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {w.ipv4_address ? <span className="mono" style={{ fontSize: 11 }}>{w.ipv4_address}{w.mask ? `/${w.mask}` : ''}</span> : null}
                      {w.default_gateway ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>gw: {w.default_gateway}</span> : null}
                      {w.manage_vlan ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>VLAN: {w.manage_vlan}</span> : null}
                    </div>
                    <div style={{ marginTop: 1 }}>
                      {w.mac_address ? <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>MAC: {w.mac_address}</span> : null}
                      {w.encap_type || w.l2_encap_type ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>{w.encap_type || w.l2_encap_type}</span> : null}
                      {w.pppoe_username ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>PPPoE: {w.pppoe_username}</span> : null}
                    </div>
                  </div>
                ))}
              </dd>
            </>
          ) : o.ip_address ? (
            <>
              <dt style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>{t('onuView.wan.title')}</dt>
              <dd style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                <span className="mono">{o.ip_address}</span>
                {o.wan_mask ? <span className="text-muted" style={{ marginLeft: 4 }}>/{o.wan_mask}</span> : null}
                {o.wan_gateway ? <span className="text-muted" style={{ marginLeft: 8 }}>gw: {o.wan_gateway}</span> : null}
                {o.wan_vlan ? <span className="text-muted" style={{ marginLeft: 8 }}>VLAN: {o.wan_vlan}</span> : null}
                <div style={{ marginTop: 2 }}>
                  {o.mac ? <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.mac}</span> : null}
                  {o.wan_ip_source ? <span className="text-muted" style={{ marginLeft: 8 }}>{o.wan_ip_source}</span> : null}
                  {o.wan_encap ? <span className="text-muted" style={{ marginLeft: 4 }}>· {o.wan_encap}</span> : null}
                </div>
              </dd>
            </>
          ) : null}

          {(o.download_profile || o.upload_profile) ? (
            <>
              <dt>{t('onuView.speedProfiles.title')}</dt>
              <dd>
                {o.download_profile ? <span className="badge" style={{ background: 'rgba(31,111,235,0.12)', color: '#4792e6', marginRight: 4 }}>↓ {o.download_profile}{o.download_mbps ? ` (${o.download_mbps} Mbps)` : ''}</span> : null}
                {o.upload_profile ? <span className="badge" style={{ background: 'rgba(92,184,92,0.12)', color: '#5cb85c' }}>↑ {o.upload_profile}{o.upload_mbps ? ` (${o.upload_mbps} Mbps)` : ''}</span> : null}
                {o.vlan ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>VLAN: {o.vlan}</span> : null}
                {o.gem ? <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>GEM: {o.gem}</span> : null}
              </dd>
            </>
          ) : null}

          {(o.has_catv || o.has_iptv) ? (
            <>
              <dt>TV services</dt>
              <dd>
                {o.has_catv ? (
                  <span className="badge" style={{ background: 'rgba(92,184,92,0.15)', color: '#5cb85c', marginRight: 4 }}>
                    CATV (RF){(o.catv_ports && o.catv_ports.length)
                      ? ` · ${o.catv_ports.map(p => `${p.link}${p.tx_power_dbmv != null ? ` ${p.tx_power_dbmv} dBmV` : ''}`).join(', ')}`
                      : ''}
                  </span>
                ) : null}
                {o.has_iptv ? (
                  <span className="badge" style={{ background: 'rgba(71,146,230,0.15)', color: '#4792e6' }}>
                    IPTV (multicast){o.iptv_vlan ? ` · VLAN ${o.iptv_vlan}` : ''}
                  </span>
                ) : null}
              </dd>
            </>
          ) : null}

          <dt>VoIP</dt>
          <dd>
            <a href="#voipService" onClick={() => setModal({ type: 'VoIP service' })}>
              {o.voip_enabled ? 'Enabled' : 'Disabled'}
            </a>
          </dd>
          <dt>Web user</dt>
          <dd>
            <a href="#updateWebPass" onClick={() => setModal({ type: 'webPass' })}>
              {v(o.web_user)}
            </a>
          </dd>
          <dt>Web password</dt>
          <dd>
            <a href="#updateWebPass" onClick={() => setModal({ type: 'webPass' })}>
              {o.web_pass ? '**********' : '—'}
            </a>
          </dd>
        </dl>
      </div>

      <dl className="dl-horizontal col-xs-12 col-sm-12">
        <dt>{t('onuView.status')}</dt>
        <dd>
          <button className="btn btn-success margin-bottom status_buttons" onClick={async () => {
            setRefreshing(true);
            const results = {};
            try { const r = await ontAPI.signal(id); results.status = r.data?.data || r.data; } catch { results.status = { error: 'Failed' }; }
            try { const r = await ontAPI.runningConfig(id); results.config = r.data?.data || r.data; } catch { results.config = { error: 'Failed' }; }
            try { const r = await ontAPI.swInfo(id); results.sw = r.data?.data || r.data; } catch { results.sw = { error: 'Failed' }; }
            try { await fetchTR069Stat(id, (r) => { results.tr069 = r?.data || r; }); } catch { results.tr069 = { error: 'Failed' }; }
            setReadResult({ title: 'ONU status', data: results });
            setRefreshing(false);
          }} disabled={refreshing}>{refreshing ? t('onuView.refreshing') : t('onuView.refreshAll')}</button>

          <button className="btn btn-success margin-bottom live"
            style={{ backgroundColor: '#1fb325', borderColor: '#1fb325' }}
            onClick={() => setModal({ type: 'liveSignal' })}>
            {t('onuView.live')}
          </button>

          <pre id="status" className="hidden status_container text-wrap" />
          <div id="status_tr69" className="status_container hidden" />
        </dd>

        <dt style={{ marginBottom: 5 }} />
        <dd />

        <dt>Graphs</dt>
        <dd style={{ position: 'relative' }}>
          <div className="graphs-container" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            <div className="graph-item" style={{
              flex: '0 1 calc(50% - 8px)', minWidth: 'min(100%, 360px)', maxWidth: '100%',
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 8px 6px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#5AC8FA' }}>●</span> Down <span style={{ color: '#FF9500' }}>●</span> Up
              </div>
              <TrafficChart ontId={id} height={200} />
            </div>
            <div className="graph-item" style={{
              flex: '0 1 calc(50% - 8px)', minWidth: 'min(100%, 360px)', maxWidth: '100%',
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 8px 6px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#34C759' }}>●</span> Signal
              </div>
              <SignalChart ontId={id} height={200} />
            </div>
          </div>
          <a href="#" className="more" onClick={e => { e.preventDefault(); setModal({ type: 'moreGraphs' }); }}
            style={{ position: 'absolute', top: -22, right: 0, fontSize: 12, cursor: 'pointer' }}>
            {t('onuView.moreGraphs')} ▸
          </a>
        </dd>

        <dt>Live Signal</dt>
        <dd>
          <button className="btn btn-sm" style={{
            backgroundColor: liveEnabled ? '#1fb325' : 'transparent',
            border: `1px solid ${liveEnabled ? '#1fb325' : 'var(--border)'}`,
            color: liveEnabled ? '#fff' : 'var(--text-muted)',
            fontSize: 11, padding: '4px 12px', cursor: 'pointer',
          }} onClick={() => setLiveEnabled(s => !s)}>
            {liveEnabled ? '● LIVE' : 'Start live monitoring'}
          </button>
          {liveEnabled && (
            <div style={{ marginTop: 8 }}>
              <LiveSignalInline ontId={id} />
            </div>
          )}
        </dd>

        <dt>{t('onuView.speedProfiles.title')}</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <tr>
              <th>{t('onuView.speedProfiles.servicePortId')}</th>
              <th>{t('onuView.speedProfiles.svlan')}</th>
              <th>{t('onuView.speedProfiles.userVlan')}</th>
              <th>{t('onuView.speedProfiles.download')}</th>
              <th>{t('onuView.speedProfiles.upload')}</th>
              <th>{t('onuView.speedProfiles.action')}</th>
            </tr>
            <tbody>
              {(o.service_ports || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('onuView.speedProfiles.noPorts')}</td></tr>
              ) : (o.service_ports || []).map(sp => (
                <tr className="valign-center" key={sp.id || sp.service_port_id}>
                  <td>{sp.service_port_id || sp.id}</td>
                  <td>{sp.svlan || ''}</td>
                  <td>{sp.user_vlan || sp.vlan}</td>
                  <td>{sp.download || sp.download_speed}</td>
                  <td>{sp.upload || sp.upload_speed}</td>
                  <td>
                    <a href="#" className="btn btn-link" onClick={() => handleDelete(sp.id)}>
                      <IconTrash size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

        <dt>{t('onuView.ethernetPorts')}</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <tr>
              <th className="col-md-1">{t('onuView.ethPorts.port')}</th>
              <th className="col-md-1">{t('onuView.ethPorts.adminState')}</th>
              <th className="col-md-3">{t('onuView.ethPorts.mode')}</th>
              <th className="col-md-1">{t('onuView.ethPorts.dhcp')}</th>
              <th className="col-md-1 text-center">{t('onuView.ethPorts.action')}</th>
            </tr>
            <tbody>
              {(o.eth_ports || [{ port: 'eth_0/1' }, { port: 'eth_0/2' }, { port: 'eth_0/3' }, { port: 'eth_0/4' }]).map(ep => (
                <tr className="valign-center" key={ep.port}>
                  <td>{ep.port}</td>
                  <td>{ep.admin_state || ep.state === 1 ? 'Enabled' : 'Disabled'}</td>
                  <td>{ep.mode || 'LAN'}</td>
                  <td>{ep.dhcp || 'No control'}</td>
                  <td>
                    <a href="#" className="btn btn-link" onClick={() => handleDelete(ep.port)}>
                      <IconTrash size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

        <dt>{t('onuView.wifiPorts')}</dt>
        <dd>
          <table className="table table-bordered table-striped table-condensed table-nonfluid">
            <tr>
              <th className="col-md-1">{t('onuView.wifiPorts.port')}</th>
              <th className="col-md-1">{t('onuView.wifiPorts.adminState')}</th>
              <th className="col-md-2">{t('onuView.wifiPorts.mode')}</th>
              <th className="col-md-2">{t('onuView.wifiPorts.ssid')}</th>
              <th className="col-md-1">{t('onuView.wifiPorts.dhcp')}</th>
              <th className="col-md-1 text-center">{t('onuView.wifiPorts.action')}</th>
            </tr>
            <tbody>
              {(o.wifi_ports || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('onuView.wifiPorts.noPorts')}</td></tr>
              ) : (o.wifi_ports || []).map(wp => (
                <tr className="valign-center" key={wp.port}>
                  <td>{wp.port}</td>
                  <td>{wp.admin_state || 'Enabled'}</td>
                  <td>{wp.mode || 'Access point'}</td>
                  <td>{wp.ssid || '—'}</td>
                  <td>{wp.dhcp || 'No control'}</td>
                  <td>
                    <a href="#" className="btn btn-link" onClick={() => handleDelete(wp.port)}>
                      <IconTrash size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>

      </dl>

      <div className="col-xs-12" style={{ marginTop: 8, marginBottom: 16 }}>
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 6,
        }}>
          <button className="btn btn-success margin-bottom status_buttons" onClick={async () => {
            setRefreshing(true);
            const results = {};
            try { const r = await ontAPI.signal(id); results.status = r.data?.data || r.data; } catch { results.status = { error: 'Failed' }; }
            try { const r = await ontAPI.runningConfig(id); results.config = r.data?.data || r.data; } catch { results.config = { error: 'Failed' }; }
            try { const r = await ontAPI.swInfo(id); results.sw = r.data?.data || r.data; } catch { results.sw = { error: 'Failed' }; }
            try { await fetchTR069Stat(id, (r) => { results.tr069 = r?.data || r; }); } catch { results.tr069 = { error: 'Failed' }; }
            setReadResult({ title: 'ONU status', data: results });
            setRefreshing(false);
          }} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Get status'}</button>
          <button className="btn btn-info btn-sm" onClick={async () => {
            setRefreshing(true);
            try { const r = await ontAPI.runningConfig(id); setReadResult({ title: 'Running config', data: r.data?.data || r.data }); }
            catch { setReadResult({ title: 'Running config', data: { error: 'Failed' } }); }
            setRefreshing(false);
          }} disabled={refreshing}>Show running-config</button>
          <button className="btn btn-info btn-sm" onClick={async () => {
            setRefreshing(true);
            try { const r = await ontAPI.swInfo(id); setReadResult({ title: 'SW Info', data: r.data?.data || r.data }); }
            catch { setReadResult({ title: 'SW Info', data: { error: 'Failed' } }); }
            setRefreshing(false);
          }} disabled={refreshing}>SW info</button>
          <button className="btn btn-success btn-sm" style={{ backgroundColor: '#337ab7', borderColor: '#2e6da4' }}
            onClick={async () => {
              try { await fetchTR069Stat(id, (r) => setReadResult({ title: 'TR069 Stat', data: r?.data || r })); }
              catch { setReadResult({ title: 'TR069 Stat', data: { error: 'Failed' } }); }
            }}>TR069 Stat</button>
        </div>
      </div>

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

      <EPONChannelModal
        open={m('Update EPON channel')}
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

      <HistoryModal
        open={m('history')}
        ontId={id}
        ontName={name}
        onClose={() => setModal(null)}
      />

      <MoreGraphsModal
        open={m('moreGraphs')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <LiveSignalModal
        open={m('liveSignal')}
        ontId={id}
        onClose={() => setModal(null)}
      />

      <SaveConfigModal
        open={m('Save Config')}
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
