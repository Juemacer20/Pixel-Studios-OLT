import React, { useState } from 'react';
import {
  IconSettings, IconClock, IconWifi, IconBell,
  IconDatabase, IconDeviceFloppy, IconCheck, IconRefresh,
} from '@tabler/icons-react';

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
      {saved ? <><IconCheck size={13} /> Guardado</> : <><IconDeviceFloppy size={13} /> Guardar</>}
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
          Información de la Empresa
        </div>
        <FieldRow label="Nombre de empresa">
          <input className="input-base" value={data.company} style={{ maxWidth: 320 }}
            onChange={e => onChange({ ...data, company: e.target.value })} />
        </FieldRow>
        <FieldRow label="Zona horaria">
          <select className="select-base" style={{ maxWidth: 320 }} value={data.timezone}
            onChange={e => onChange({ ...data, timezone: e.target.value })}>
            <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (UTC-3)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
            <option value="UTC">UTC</option>
          </select>
        </FieldRow>
        <FieldRow label="Idioma">
          <select className="select-base" style={{ maxWidth: 180 }} value={data.language}
            onChange={e => onChange({ ...data, language: e.target.value })}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </FieldRow>
        <FieldRow label="URL de logo" hint="Opcional. Se muestra en la barra lateral.">
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
        Configuración de Polling SNMP
      </div>
      <FieldRow label="Intervalo de polling" hint="Frecuencia con la que se consultan los dispositivos.">
        <NumberInput value={data.interval} min={1} max={60} unit="minutos"
          onChange={v => onChange({ ...data, interval: v })} />
      </FieldRow>
      <FieldRow label="SNMP Timeout">
        <NumberInput value={data.snmp_timeout} min={1} max={30} unit="segundos"
          onChange={v => onChange({ ...data, snmp_timeout: v })} />
      </FieldRow>
      <FieldRow label="Reintentos SNMP">
        <NumberInput value={data.snmp_retries} min={0} max={10}
          onChange={v => onChange({ ...data, snmp_retries: v })} />
      </FieldRow>
      <FieldRow label="Versión SNMP">
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
          Umbrales de Señal RX (dBm)
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', fontSize: 11 }}>
          <div style={{ flex: 1, height: 18, background: 'rgba(188,140,255,0.3)', borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontWeight: 600 }}>High &gt;-15</div>
          <div style={{ flex: 2, height: 18, background: 'rgba(63,185,80,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', fontWeight: 600 }}>Óptimo</div>
          <div style={{ flex: 2, height: 18, background: 'rgba(121,192,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', fontWeight: 600 }}>Normal</div>
          <div style={{ flex: 1, height: 18, background: 'rgba(210,153,34,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 600 }}>Débil</div>
          <div style={{ flex: 1, height: 18, background: 'rgba(248,81,73,0.3)', borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontWeight: 600 }}>Crítico</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FieldRow label="RX Óptimo — mínimo (dBm)">
            <NumberInput value={data.rx_optimal_min} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_optimal_min: v })} />
          </FieldRow>
          <FieldRow label="RX Óptimo — máximo (dBm)">
            <NumberInput value={data.rx_optimal_max} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_optimal_max: v })} />
          </FieldRow>
          <FieldRow label="RX Warning — mínimo (dBm)">
            <NumberInput value={data.rx_warning_min} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_warning_min: v })} />
          </FieldRow>
          <FieldRow label="RX Warning — máximo (dBm)">
            <NumberInput value={data.rx_warning_max} min={-40} max={0} step={0.5} unit="dBm"
              onChange={v => onChange({ ...data, rx_warning_max: v })} />
          </FieldRow>
          <FieldRow label="RX Crítico — umbral (dBm)" hint="Señal por debajo de este valor se considera crítica.">
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
            <FieldRow label="Destinatario">
              <input className="input-base" value={data.email_to} style={{ maxWidth: 320 }}
                placeholder="noc@empresa.com" onChange={e => onChange({ ...data, email_to: e.target.value })} />
            </FieldRow>
            <div style={{ display: 'flex', gap: 16 }}>
              <Toggle checked={data.email_critical} onChange={v => onChange({ ...data, email_critical: v })} label="Alertas Críticas" />
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
          <FieldRow label="Número de teléfono">
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
          <FieldRow label="URL del webhook" hint="Se enviará un POST con JSON al dispararse una alerta.">
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
          Backup automático
        </div>
        <Toggle checked={data.auto_backup} onChange={v => onChange({ ...data, auto_backup: v })} label="Habilitar backup automático" />
        {data.auto_backup && (
          <>
            <FieldRow label="Frecuencia">
              <select className="select-base" style={{ width: 160 }} value={data.backup_interval}
                onChange={e => onChange({ ...data, backup_interval: e.target.value })}>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
              </select>
            </FieldRow>
            <FieldRow label="Retención (días)" hint="Cantidad de backups a conservar.">
              <NumberInput value={data.backup_retain} min={1} max={90} unit="días"
                onChange={v => onChange({ ...data, backup_retain: v })} />
            </FieldRow>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Último backup: {data.last_backup ? new Date(data.last_backup).toLocaleString('es-AR') : 'Nunca'}
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
              : <><IconDatabase size={13} /> Crear backup ahora</>}
          </button>
          <button
            className="btn"
            onClick={() => { setRestoring(true); setTimeout(() => setRestoring(false), 2000); }}
            disabled={restoring}
          >
            {restoring ? 'Restaurando...' : 'Restaurar backup...'}
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
      </div>
    </div>
  );
}
