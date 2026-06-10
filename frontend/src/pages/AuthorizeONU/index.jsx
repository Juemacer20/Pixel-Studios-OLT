import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ontAPI, oltAPI, onuTypeAPI, speedProfileAPI, zoneAPI, odbAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STEPS = [
  { n: 1, title: 'Detection', desc: 'OLT, Board, Port, SN' },
  { n: 2, title: 'Configuration', desc: 'ONU type, VLANs' },
  { n: 3, title: 'Speed', desc: 'Download & Upload' },
  { n: 4, title: 'Location', desc: 'Zone, ODB, Address' },
  { n: 5, title: 'Confirm', desc: 'Review & authorize' },
];

const arr = (r) => r?.data?.data ?? r?.data ?? [];

export default function AuthorizeONU() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    oltId: '', board: '', port: '', serialNumber: sp.get('sn') || '', ponType: 'GPON',
    onuTypeId: '', svlanId: '', cvlanId: '', tagTransform: 'translate',
    downloadSpeed: '', uploadSpeed: '',
    zone: '', odb: '', name: '', address: '', contact: '', lat: '', lng: '', mode: 'Bridge',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: olts } = useQuery({ queryKey: ['olts-list'], queryFn: () => oltAPI.list().then(arr) });
  const { data: onuTypes } = useQuery({ queryKey: ['onu-types'], queryFn: () => onuTypeAPI.list().then(arr) });
  const { data: profiles } = useQuery({ queryKey: ['speed-profiles'], queryFn: () => speedProfileAPI.list().then(arr) });
  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: () => zoneAPI.list().then(arr) });
  const { data: odbs } = useQuery({ queryKey: ['odbs'], queryFn: () => odbAPI.list().then(arr) });

  const authorizeMut = useMutation({
    mutationFn: () => ontAPI.authorize(form),
    onSuccess: () => { toast.success('ONU authorized'); navigate('/onts'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Authorization failed'),
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const canNext = step !== 0 || (form.oltId && form.serialNumber && form.board !== '' && form.port !== '');

  const Field = ({ label, children }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
      <span>{label}</span>{children}
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: 0 }}>Authorize ONU</h1>

      {/* Stepper */}
      <div style={{ display: 'flex', background: 'var(--content-bg)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{
            flex: 1, padding: '10px 12px', textAlign: 'center', fontSize: 12,
            borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
            background: i === step ? 'rgba(43,127,212,0.14)' : i < step ? 'rgba(35,168,90,0.08)' : 'transparent',
            color: i === step ? 'var(--accent)' : i < step ? 'var(--green)' : 'var(--text-muted)',
            fontWeight: i === step ? 700 : 400,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{s.n}</div>
            <div>{s.title}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ minHeight: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {step === 0 && (<>
          <Field label="OLT">
            <select className="input-base" value={form.oltId} onChange={(e) => set('oltId', e.target.value)}>
              <option value="">Select OLT…</option>
              {(olts || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Board"><input className="input-base" type="number" value={form.board} onChange={(e) => set('board', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Port"><input className="input-base" type="number" value={form.port} onChange={(e) => set('port', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
          </div>
          <Field label="Serial Number (SN)"><input className="input-base" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} /></Field>
          <Field label="PON type">
            <select className="input-base" value={form.ponType} onChange={(e) => set('ponType', e.target.value)}>
              <option>GPON</option><option>EPON</option><option>XGSPON</option>
            </select>
          </Field>
        </>)}

        {step === 1 && (<>
          <Field label="ONU type">
            <select className="input-base" value={form.onuTypeId} onChange={(e) => set('onuTypeId', e.target.value)}>
              <option value="">Select type…</option>
              {(onuTypes || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="S-VLAN"><input className="input-base" type="number" value={form.svlanId} onChange={(e) => set('svlanId', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="C-VLAN / User VLAN"><input className="input-base" type="number" value={form.cvlanId} onChange={(e) => set('cvlanId', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
          </div>
          <Field label="Tag-transform">
            <select className="input-base" value={form.tagTransform} onChange={(e) => set('tagTransform', e.target.value)}>
              <option value="translate">translate</option><option value="default">default</option><option value="transparent">transparent</option>
            </select>
          </Field>
          <Field label="Mode">
            <select className="input-base" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option>Bridge</option><option>Router</option>
            </select>
          </Field>
        </>)}

        {step === 2 && (<>
          <Field label="Download speed">
            <select className="input-base" value={form.downloadSpeed} onChange={(e) => set('downloadSpeed', e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Select…</option>
              {(profiles || []).map((p) => <option key={p.id} value={p.speedKbps || (p.download_mbps * 1000)}>{p.name} ({p.type})</option>)}
            </select>
          </Field>
          <Field label="Upload speed">
            <select className="input-base" value={form.uploadSpeed} onChange={(e) => set('uploadSpeed', e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Select…</option>
              {(profiles || []).map((p) => <option key={p.id} value={p.speedKbps || (p.upload_mbps * 1000)}>{p.name} ({p.type})</option>)}
            </select>
          </Field>
        </>)}

        {step === 3 && (<>
          <Field label="Name / Client"><input className="input-base" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Zone">
              <select className="input-base" value={form.zone} onChange={(e) => set('zone', e.target.value)}>
                <option value="">—</option>
                {(zones || []).map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
              </select>
            </Field>
            <Field label="ODB">
              <select className="input-base" value={form.odb} onChange={(e) => set('odb', e.target.value)}>
                <option value="">—</option>
                {(odbs || []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Address"><input className="input-base" value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Contact"><input className="input-base" value={form.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Latitude"><input className="input-base" type="number" value={form.lat} onChange={(e) => set('lat', e.target.value)} /></Field>
            <Field label="Longitude"><input className="input-base" type="number" value={form.lng} onChange={(e) => set('lng', e.target.value)} /></Field>
          </div>
        </>)}

        {step === 4 && (
          <div style={{ fontSize: 13 }}>
            <h3 style={{ marginTop: 0 }}>Review</h3>
            {Object.entries({
              OLT: (olts || []).find((o) => o.id === form.oltId)?.name, Board: form.board, Port: form.port,
              'Serial': form.serialNumber, 'PON': form.ponType,
              'ONU type': (onuTypes || []).find((t) => t.id === form.onuTypeId)?.name,
              'S-VLAN': form.svlanId, 'C-VLAN': form.cvlanId, 'Tag-transform': form.tagTransform, Mode: form.mode,
              'Download (Kbps)': form.downloadSpeed, 'Upload (Kbps)': form.uploadSpeed,
              Name: form.name, Zone: form.zone, ODB: form.odb, Address: form.address, Contact: form.contact,
            }).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(120,160,200,.07)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)' }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={prev} disabled={step === 0}>Previous</button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={next} disabled={!canNext}>Next</button>
        ) : (
          <button className="btn btn-primary" onClick={() => authorizeMut.mutate()} disabled={authorizeMut.isPending}>
            {authorizeMut.isPending ? 'Authorizing…' : 'Authorize'}
          </button>
        )}
      </div>
    </div>
  );
}
