import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowLeft, IconDeviceFloppy, IconPlugConnected, IconLoader2,
} from '@tabler/icons-react';
import { oltAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PON_TYPES = ['GPON', 'EPON', 'GPON+EPON'];
const MANUFACTURERS = ['Huawei', 'VSOL', 'ZTE', 'KingType', 'Fiberhome', 'Nokia'];

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'center', padding: '7px 0' }}>
      <label style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export default function OLTConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState(false);

  const { data: olt, isLoading } = useQuery({
    queryKey: ['olt', id],
    queryFn: () => oltAPI.get(id).then(r => r.data?.data ?? r.data),
    retry: 1,
  });

  useEffect(() => {
    if (olt) setForm({
      name: olt.name || '', ip: olt.ip || olt.host || '', tcp_port: olt.tcp_port ?? 23,
      telnet_user: olt.telnet_user || '', telnet_pass: olt.telnet_pass || '',
      snmp_read: olt.snmp_read || '', snmp_write: olt.snmp_write || '', udp_port: olt.udp_port ?? 161,
      iptv_enabled: !!olt.iptv_enabled, brand: olt.brand || 'Huawei',
      hw_version: olt.hw_version || olt.model || '', sw_version: olt.sw_version || '',
      pon_type: olt.pon_type || 'GPON', latitude: olt.latitude ?? '', longitude: olt.longitude ?? '',
    });
  }, [olt]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => oltAPI.update(id, {
      ...form,
      tcp_port: Number(form.tcp_port) || null, udp_port: Number(form.udp_port) || null,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    }),
    onSuccess: () => { toast.success('OLT saved'); qc.invalidateQueries({ queryKey: ['olt', id] }); qc.invalidateQueries({ queryKey: ['olts'] }); },
    onError: () => toast.error('Save failed'),
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const r = await oltAPI.testConnection(id);
      const d = r.data?.data ?? r.data;
      if (d.reachable) toast.success(`✓ Reachable — ${d.message} · ${d.ms}ms`, { duration: 5000 });
      else toast.error(`✗ Unreachable — ${d.message}`, { duration: 5000 });
    } catch (e) { toast.error('Test failed'); }
    finally { setTesting(false); }
  };

  if (isLoading || !form) {
    return <div className="card"><div className="empty-state"><span className="spinner" style={{ margin: '0 auto 10px', display: 'block' }} />Loading OLT…</div></div>;
  }

  const inp = { className: 'input-base', style: { maxWidth: 420 } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" onClick={() => navigate('/olts')}><IconArrowLeft size={14} /> Back</button>
        <h1 className="page-title" style={{ margin: 0 }}>{form.name || 'OLT'}</h1>
        <span className="badge badge-blue" style={{ marginLeft: 4 }}>{form.brand} · {form.hw_version}</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span>⚙ OLT settings</span></div>
        <div style={{ padding: '16px 20px' }}>
          <Row label="Name"><input {...inp} value={form.name} onChange={e => set('name', e.target.value)} /></Row>
          <Row label="OLT IP # FQDN"><input {...inp} value={form.ip} onChange={e => set('ip', e.target.value)} /></Row>
          <Row label="Telnet TCP port"><input {...inp} type="number" style={{ ...inp.style, maxWidth: 140 }} value={form.tcp_port} onChange={e => set('tcp_port', e.target.value)} /></Row>
          <Row label="OLT telnet username"><input {...inp} value={form.telnet_user} onChange={e => set('telnet_user', e.target.value)} /></Row>
          <Row label="OLT telnet password"><input {...inp} type="password" placeholder="••••••••" value={form.telnet_pass} onChange={e => set('telnet_pass', e.target.value)} /></Row>
          <Row label="Snmp readonly community"><input {...inp} value={form.snmp_read} onChange={e => set('snmp_read', e.target.value)} /></Row>
          <Row label="Snmp readwrite community"><input {...inp} value={form.snmp_write} onChange={e => set('snmp_write', e.target.value)} /></Row>
          <Row label="SNMP UDP port"><input {...inp} type="number" style={{ ...inp.style, maxWidth: 140 }} value={form.udp_port} onChange={e => set('udp_port', e.target.value)} /></Row>
          <Row label="IPTV module">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" className="checkbox" checked={form.iptv_enabled} onChange={e => set('iptv_enabled', e.target.checked)} /> Enable
            </label>
          </Row>
          <Row label="OS manufacturer">
            <select className="select-base" style={{ maxWidth: 220 }} value={form.brand} onChange={e => set('brand', e.target.value)}>
              {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Row>
          <Row label="OLT hardware version"><input {...inp} value={form.hw_version} onChange={e => set('hw_version', e.target.value)} /></Row>
          <Row label="OLT software version">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input {...inp} style={{ ...inp.style, maxWidth: 200 }} value={form.sw_version} onChange={e => set('sw_version', e.target.value)} />
              <span style={{ fontSize: 11, color: 'var(--green)' }}>(Detected)</span>
            </span>
          </Row>
          <Row label="Supported PON types">
            <div style={{ display: 'flex', gap: 18 }}>
              {PON_TYPES.map(t => (
                <label key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" name="pon" checked={form.pon_type === t} onChange={() => set('pon_type', t)} style={{ accentColor: 'var(--accent)' }} /> {t}
                </label>
              ))}
            </div>
          </Row>
          <Row label="Latitude"><input {...inp} style={{ ...inp.style, maxWidth: 220 }} value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="-31.4..." /></Row>
          <Row label="Longitude"><input {...inp} style={{ ...inp.style, maxWidth: 220 }} value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="-58.0..." /></Row>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => navigate('/olts')}>Cancel</button>
            <button className="btn" style={{ borderColor: 'var(--accent)', color: '#7fb6ec' }} onClick={testConnection} disabled={testing}>
              {testing ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlugConnected size={14} />} Test connection
            </button>
            <button className="btn btn-success" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <IconDeviceFloppy size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
