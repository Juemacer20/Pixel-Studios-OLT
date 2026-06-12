import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowLeft, IconDeviceFloppy,
} from '@tabler/icons-react';
import { oltAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PON_TYPES = ['GPON', 'EPON', 'GPON+EPON'];
const BRAND_CONFIG = {
  Huawei: {
    models: ['MA5800-X15', 'MA5800-X17', 'MA5800-X7', 'MA5800-X2', 'MA5800-GP08', 'MA5800-GP16', 'MA5680T', 'MA5683T'],
    swVersions: ['R008', 'R009', 'R010', 'R011', 'R012', 'R013', 'R014', 'R015', 'R016', 'R017', 'R018', 'R019', 'R020', 'R021'],
  },
  VSOL: {
    models: ['V2801', 'V1600G1', 'V2802', 'V2804'],
    swVersions: ['V1.0', 'V2.0', 'V3.0'],
  },
  KingType: {
    models: ['C300', 'C200', 'C100'],
    swVersions: ['V1.0', 'V2.0', 'V3.0'],
  },
};
const MANUFACTURERS = Object.keys(BRAND_CONFIG).concat(['ZTE', 'Fiberhome', 'Nokia']);

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, alignItems: 'center', padding: '7px 0' }}>
      <label style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export default function OLTNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    ip: '',
    tcp_port: 2333,
    telnet_user: '',
    telnet_pass: '',
    snmp_read: '',
    snmp_write: '',
    udp_port: 2161,
    iptv_enabled: false,
    brand: 'Huawei',
    model: 'MA5800-X15',
    hw_version: 'MA5800-X15',
    sw_version: 'R018',
    pon_type: 'GPON',
    location: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleBrandChange = (brand) => {
    const cfg = BRAND_CONFIG[brand];
    setForm(f => ({
      ...f,
      brand,
      model: cfg ? cfg.models[0] : '',
      hw_version: cfg ? cfg.models[0] : '',
      sw_version: cfg ? cfg.swVersions[0] : '',
    }));
  };

  const handleHwChange = (v) => setForm(f => ({ ...f, hw_version: v, model: v }));

  const createMut = useMutation({
    mutationFn: () => oltAPI.create({
      ...form,
      model: form.model || form.hw_version || 'Generic',
      tcp_port: Number(form.tcp_port) || null,
      udp_port: Number(form.udp_port) || null,
    }),
    onSuccess: () => {
      toast.success('OLT created successfully');
      qc.invalidateQueries({ queryKey: ['olts'] });
      navigate('/olts');
    },
    onError: () => toast.error('Failed to create OLT'),
  });

  const inp = { className: 'input-base', style: { maxWidth: 420 } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" onClick={() => navigate('/olts')}><IconArrowLeft size={14} /> Back</button>
        <h1 className="page-title" style={{ margin: 0 }}>Add OLT</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="sol-card-h"><span>⚙ Add new OLT</span></div>
        <div style={{ padding: '16px 20px' }}>
          <Row label="Name">
            <input {...inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="OLT-NORTE" />
          </Row>
          <Row label="OLT IP / FQDN">
            <input {...inp} value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="192.168.1.10" />
          </Row>
          <Row label="Telnet TCP port">
            <input {...inp} type="number" style={{ ...inp.style, maxWidth: 140 }} value={form.tcp_port} onChange={e => set('tcp_port', e.target.value)} />
          </Row>
          <Row label="OLT telnet username">
            <input {...inp} value={form.telnet_user} onChange={e => set('telnet_user', e.target.value)} />
          </Row>
          <Row label="OLT telnet password">
            <input {...inp} type="password" placeholder="••••••••" value={form.telnet_pass} onChange={e => set('telnet_pass', e.target.value)} />
          </Row>
          <Row label="SNMP readonly community">
            <input {...inp} value={form.snmp_read} onChange={e => set('snmp_read', e.target.value)} placeholder="public" />
          </Row>
          <Row label="SNMP readwrite community">
            <input {...inp} value={form.snmp_write} onChange={e => set('snmp_write', e.target.value)} placeholder="private" />
          </Row>
          <Row label="SNMP UDP port">
            <input {...inp} type="number" style={{ ...inp.style, maxWidth: 140 }} value={form.udp_port} onChange={e => set('udp_port', e.target.value)} />
          </Row>
          <Row label="IPTV module">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" className="checkbox" checked={form.iptv_enabled} onChange={e => set('iptv_enabled', e.target.checked)} /> Enable
            </label>
          </Row>
          <Row label="OS manufacturer">
            <select className="select-base" style={{ maxWidth: 220 }} value={form.brand} onChange={e => handleBrandChange(e.target.value)}>
              {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Row>
          <Row label="OLT hardware version">
            {BRAND_CONFIG[form.brand] ? (
              <select className="select-base" style={{ maxWidth: 220 }} value={form.hw_version} onChange={e => handleHwChange(e.target.value)}>
                {BRAND_CONFIG[form.brand].models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input {...inp} value={form.hw_version} onChange={e => handleHwChange(e.target.value)} placeholder="MA5800-X15" />
            )}
          </Row>
          <Row label="OLT software version">
            {BRAND_CONFIG[form.brand] ? (
              <select className="select-base" style={{ maxWidth: 220 }} value={form.sw_version} onChange={e => set('sw_version', e.target.value)}>
                {BRAND_CONFIG[form.brand].swVersions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input {...inp} style={{ ...inp.style, maxWidth: 200 }} value={form.sw_version} onChange={e => set('sw_version', e.target.value)} placeholder="R018" />
            )}
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
          <Row label="Location">
            <input {...inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Main Data Center" />
          </Row>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => navigate('/olts')}>Cancel</button>
            <button className="btn btn-success" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              <IconDeviceFloppy size={14} /> Add OLT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
