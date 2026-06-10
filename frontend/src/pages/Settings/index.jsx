import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconSettings, IconClock, IconWifi, IconBell,
  IconDatabase, IconDeviceFloppy, IconCheck, IconRefresh, IconKey, IconCreditCard, IconTrash,
} from '@tabler/icons-react';
import { apiKeyAPI, settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const arr = (r) => r?.data?.data ?? r?.data ?? [];

// ── API Keys tab ──
function ApiKeysTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['api-keys'], queryFn: () => apiKeyAPI.list().then(arr).catch(() => []) });
  const keys = Array.isArray(data) ? data : [];
  const createMut = useMutation({ mutationFn: () => apiKeyAPI.create({ name: 'API key', type: 'full' }),
    onSuccess: () => { toast.success('API key generated'); qc.invalidateQueries({ queryKey: ['api-keys'] }); } });
  const regenMut = useMutation({ mutationFn: (id) => apiKeyAPI.regenerate(id),
    onSuccess: () => { toast.success('Regenerated'); qc.invalidateQueries({ queryKey: ['api-keys'] }); } });
  const delMut = useMutation({ mutationFn: (id) => apiKeyAPI.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['api-keys'] }); } });
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="sol-card-h"><span>API keys</span>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => createMut.mutate()}>Generate API Key</button></div>
      <table className="table-base">
        <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Key</th><th>Allowed IPs</th><th style={{ width: 150 }}>Actions</th></tr></thead>
        <tbody>
          {keys.length === 0 && <tr><td colSpan={6} className="empty-state">No API keys</td></tr>}
          {keys.map((k, i) => (
            <tr key={k.id}>
              <td>{i + 1}</td><td>{k.name}</td><td><span className="badge">{k.type}</span></td>
              <td className="mono" style={{ fontSize: 11 }}>{k.key.slice(0, 12)}…</td>
              <td className="mono" style={{ fontSize: 11 }}>{k.allowedIPs || 'Any'}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ fontSize: 11 }} onClick={() => regenMut.mutate(k.id)}>Regenerate</button>
                <button className="btn-icon" onClick={() => delMut.mutate(k.id)}><IconTrash size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Billing tab ──
function BillingTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['billing'], queryFn: () => settingsAPI.billing().then(arr).catch(() => []) });
  const subs = Array.isArray(data) ? data : [];
  const saveMut = useMutation({ mutationFn: ({ oltId, body }) => settingsAPI.saveBilling(oltId, body),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['billing'] }); } });
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="sol-card-h"><span>Billing — subscriptions per OLT</span></div>
      <table className="table-base">
        <thead><tr><th>OLT</th><th>Status</th><th>End date</th><th style={{ width: 120 }}>Action</th></tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.olt_id}>
              <td>{s.olt_name}</td>
              <td>
                <select className="input-base" defaultValue={s.status} id={`st-${s.olt_id}`} style={{ height: 28, fontSize: 12 }}>
                  <option value="active">active</option><option value="expired">expired</option><option value="trial">trial</option>
                </select>
              </td>
              <td><input type="date" className="input-base" id={`ed-${s.olt_id}`} defaultValue={s.endDate ? s.endDate.slice(0, 10) : ''} style={{ height: 28, fontSize: 12 }} /></td>
              <td><button className="btn" style={{ fontSize: 11 }} onClick={() => saveMut.mutate({ oltId: s.olt_id, body: {
                status: document.getElementById(`st-${s.olt_id}`).value,
                endDate: document.getElementById(`ed-${s.olt_id}`).value || null } })}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Initial state ──────────────────────────────────────────────────────────────
const INITIAL = {
  general: {
    company:  'Pixel Studios',
    timezone: 'America/Argentina/Buenos_Aires',
    language: 'es',
    logo_url: '',
  },
  polling: {
    interval:      5,
    snmp_timeout:  3,
    snmp_retries:  2,
    snmp_version:  '2c',
    snmp_community:'public',
  },
  thresholds: {
    rx_optimal_min:  -20,
    rx_optimal_max:  -15,
    rx_warning_min:  -25,
    rx_warning_max:  -20,
    rx_critical_max: -27,
    tx_warning:      -2,
    tx_critical:     0,
  },
  notifications: {
    email_enabled:   true,
    email_to:        'noc@pixel-studios.com',
    email_critical:  true,
    email_warning:   false,
    sms_enabled:     false,
    sms_number:      '',
    webhook_enabled: false,
    webhook_url:     '',
  },
  backup: {
    auto_backup:     true,
    backup_interval: 'daily',
    backup_retain:   7,
    last_backup:     new Date(Date.now() - 3600000).toISOString(),
  },
};

// ── Reusable field components ────────────────────────────────────────────────
function FieldRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number" className="input-base" style={{ width: 100 }}
        value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
      />
      {unit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onChange(!checked)}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        background: checked ? 'var(--accent)' : 'var(--border-light)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>}
    </div>
  );
}

function SaveButton({ onSave, saved }) {
  return (
    <button
      className={saved ? 'btn btn-success' : 'btn btn-primary'}
      onClick={onSave}
      style={{ minWidth: 120 }}
    >
      {saved ? <><IconCheck size={13} /> Saved</> : <><IconDeviceFloppy size={13} /> Save</>}
    </button>
  );
}

// ── Tab panels ───────────────────────────────────────────────────────────────
function GeneralTab({ data, onChange }) {
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          Company information
        </div>
        <FieldRow label="Company name">
          <input className="input-base" value={data.company} style={{ maxWidth: 320 }}
            onChange={e => onChange({ ...data, company: e.target.value })} />
        </FieldRow>
        <FieldRow label="Timezone">
          <select className="select-base" style={{ maxWidth: 320 }} value={data.timezone}
            onChange={e => onChange({ ...data, timezone: e.target.value })}>
            <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (UTC-3)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
            <option value="UTC">UTC</option>
          </select>
        </FieldRow>
        <FieldRow label="Language">
          <select className="select-base" style={{ maxWidth: 180 }} value={data.language}
            onChange={e => onChange({ ...data, language: e.target.value })}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </FieldRow>
        <FieldRow label="Logo URL" hint="Optional. Shown in the top bar.">
          <input className="input-base" value={data.logo_url} style={{ maxWidth: 380 }}
            placeholder="https://..." onChange={e => onChange({ ...data, logo_url: e.target.value })} />
        </FieldRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveButton onSave={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function PollingTab({ data, onChange }) {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        SNMP polling configuration
      </div>
      <FieldRow label="Polling interval" hint="How often devices are polled.">
        <NumberInput value={data.interval} min={1} max={60} unit="minutes"
          onChange={v => onChange({ ...data, interval: v })} />
      </FieldRow>
      <FieldRow label="SNMP Timeout">
        <NumberInput value={data.snmp_timeout} min={1} max={30} unit="seconds"
          onChange={v => onChange({ ...data, snmp_timeout: v })} />
      </FieldRow>
      <FieldRow label="SNMP retries">
        <NumberInput value={data.snmp_retries} min={0} max={10}
          onChange={v => onChange({ ...data, snmp_retries: v })} />
      </FieldRow>
      <FieldRow label="SNMP version">
        <select className="select-base" style={{ width: 120 }} value={data.snmp_version}
          onChange={e => onChange({ ...data, snmp_version: e.target.value })}>
          <option value="1">v1</option>
          <option value="2c">v2c</option>
          <option value="3">v3</option>
        </select>
      </FieldRow>
      <FieldRow label="Community string">
        <input className="input-base" value={data.snmp_community} style={{ maxWidth: 220 }}
          onChange={e => onChange({ ...data, snmp_community: e.target.value })} />
      </FieldRow>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onSave={save} saved={saved} />
      </div>
    </div>
  );
}

function ThresholdsTab({ data, onChange }) {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Visual threshold diagram */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          RX signal thresholds (dBm)
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', fontSize: 11 }}>
          <div style={{ flex: 1, height: 18, background: 'rgba(188,140,255,0.3)', borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontWeight: 600 }}>High &gt;-15</div>
          <div style={{ flex: 2, height: 18, background: 'rgba(63,185,80,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', fontWeight: 600 }}>Óptimo</div>
          <div style={{ flex: 2, height: 18, background: 'rgba(121,192,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', fontWeight: 600 }}>Normal</div>
          <div style={{ flex: 1, height: 18, background: 'rgba(210,153,34,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 600 }}>Débil</div>
          <div style={{ flex: 1, height: 18, background: 'rgba(248,81,73,0.3)', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontWeight: 600 }}>Crítico</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FieldRow label="RX Optimal — min (dBm)">
            <NumberInput value={data.rx_optimal_min} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_optimal_min: v })} />
          </FieldRow>
          <FieldRow label="RX Optimal — max (dBm)">
            <NumberInput value={data.rx_optimal_max} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_optimal_max: v })} />
          </FieldRow>
          <FieldRow label="RX Warning — min (dBm)">
            <NumberInput value={data.rx_warning_min} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_warning_min: v })} />
          </FieldRow>
          <FieldRow label="RX Warning — max (dBm)">
            <NumberInput value={data.rx_warning_max} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_warning_max: v })} />
          </FieldRow>
          <FieldRow label="RX Critical — threshold (dBm)" hint="Signal below this value is considered critical.">
            <NumberInput value={data.rx_critical_max} min={-50} max={-20} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_critical_max: v })} />
          </FieldRow>
          <FieldRow label="TX Warning (dBm)">
            <NumberInput value={data.tx_warning} min={-10} max={5} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, tx_warning: v })} />
          </FieldRow>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <SaveButton onSave={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ data, onChange }) {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Email */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
          <Toggle checked={data.email_enabled} onChange={v => onChange({ ...data, email_enabled: v })} />
        </div>
        {data.email_enabled && (
          <>
            <FieldRow label="Recipient">
              <input className="input-base" value={data.email_to} style={{ maxWidth: 320 }}
                placeholder="noc@empresa.com" onChange={e => onChange({ ...data, email_to: e.target.value })} />
            </FieldRow>
            <div style={{ display: 'flex', gap: 16 }}>
              <Toggle checked={data.email_critical} onChange={v => onChange({ ...data, email_critical: v })} label="Critical alerts" />
              <Toggle checked={data.email_warning} onChange={v => onChange({ ...data, email_warning: v })} label="Warnings" />
            </div>
          </>
        )}
      </div>

      {/* SMS */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>SMS</span>
          <Toggle checked={data.sms_enabled} onChange={v => onChange({ ...data, sms_enabled: v })} />
        </div>
        {data.sms_enabled && (
          <FieldRow label="Phone number">
            <input className="input-base" value={data.sms_number} style={{ maxWidth: 220 }}
              placeholder="+54 9 11 1234-5678" onChange={e => onChange({ ...data, sms_number: e.target.value })} />
          </FieldRow>
        )}
        {!data.sms_enabled && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Activa SMS para configurar el número.</span>
        )}
      </div>

      {/* Webhook */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Webhook</span>
          <Toggle checked={data.webhook_enabled} onChange={v => onChange({ ...data, webhook_enabled: v })} />
        </div>
        {data.webhook_enabled && (
          <FieldRow label="Webhook URL" hint="A JSON POST will be sent when an alert fires.">
            <input className="input-base" value={data.webhook_url}
              placeholder="https://hooks.slack.com/..." onChange={e => onChange({ ...data, webhook_url: e.target.value })} />
          </FieldRow>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onSave={save} saved={saved} />
      </div>
    </div>
  );
}

function BackupTab({ data, onChange }) {
  const [restoring, setRestoring] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupDone, setBackupDone] = useState(false);

  const doBackup = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      setBackupDone(true);
      onChange({ ...data, last_backup: new Date().toISOString() });
      setTimeout(() => setBackupDone(false), 3000);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          Automatic backup
        </div>
        <Toggle checked={data.auto_backup} onChange={v => onChange({ ...data, auto_backup: v })} label="Enable automatic backup" />
        {data.auto_backup && (
          <>
            <FieldRow label="Frequency">
              <select className="select-base" style={{ width: 160 }} value={data.backup_interval}
                onChange={e => onChange({ ...data, backup_interval: e.target.value })}>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
              </select>
            </FieldRow>
            <FieldRow label="Retention (days)" hint="Number of backups to keep.">
              <NumberInput value={data.backup_retain} min={1} max={90} unit="días"
                onChange={v => onChange({ ...data, backup_retain: v })} />
            </FieldRow>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Last backup: {data.last_backup ? new Date(data.last_backup).toLocaleString() : 'Never'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            className={backupDone ? 'btn btn-success' : 'btn btn-primary'}
            onClick={doBackup}
            disabled={backingUp}
          >
            {backingUp ? <><IconRefresh size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creando...</>
              : backupDone ? <><IconCheck size={13} /> Backup creado</>
              : <><IconDatabase size={13} /> Create backup now</>}
          </button>
          <button
            className="btn"
            onClick={() => { setRestoring(true); setTimeout(() => setRestoring(false), 2000); }}
            disabled={restoring}
          >
            {restoring ? 'Restaurando...' : 'Restore backup…'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { label: 'General',           icon: <IconSettings size={13} /> },
  { label: 'Polling',           icon: <IconClock size={13} /> },
  { label: 'Signal thresholds', icon: <IconWifi size={13} /> },
  { label: 'Notifications',     icon: <IconBell size={13} /> },
  { label: 'Backup',            icon: <IconDatabase size={13} /> },
  { label: 'API Key',           icon: <IconKey size={13} /> },
  { label: 'Billing',           icon: <IconCreditCard size={13} /> },
];

export default function Settings() {
  const [tab, setTab] = useState(0);
  const [cfg, setCfg] = useState(INITIAL);

  const update = (section) => (val) => setCfg(prev => ({ ...prev, [section]: val }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconSettings size={18} style={{ color: 'var(--accent)' }} />
          General settings
        </h1>
      </div>

      <div className="tab-bar">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            className={`tab-item ${tab === i ? 'tab-active' : ''}`}
            onClick={() => setTab(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 0 && <GeneralTab       data={cfg.general}       onChange={update('general')} />}
        {tab === 1 && <PollingTab       data={cfg.polling}       onChange={update('polling')} />}
        {tab === 2 && <ThresholdsTab    data={cfg.thresholds}    onChange={update('thresholds')} />}
        {tab === 3 && <NotificationsTab data={cfg.notifications} onChange={update('notifications')} />}
        {tab === 4 && <BackupTab        data={cfg.backup}        onChange={update('backup')} />}
        {tab === 5 && <ApiKeysTab />}
        {tab === 6 && <BillingTab />}
      </div>
    </div>
  );
}
