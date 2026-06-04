import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oltAPI } from '../../services/api';
import BrandTag from '../../components/shared/BrandTag';
import {
  IconArrowLeft, IconDeviceFloppy, IconRefresh, IconPlus, IconTrash,
  IconSettings, IconNetwork, IconRouter, IconCpu, IconShield,
  IconBell, IconMapPin, IconCloud, IconAlertCircle, IconCheck,
  IconX, IconTerminal2, IconChevronRight,
} from '@tabler/icons-react';

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ msg, ok, onClose }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 500,
      background: ok ? 'var(--card-bg)' : '#2d1b1b',
      border: `1px solid ${ok ? 'var(--border-light)' : 'rgba(248,81,73,.4)'}`,
      borderRadius: 8, padding: '12px 16px', minWidth: 260,
      boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', gap: 10, animation: 'fade-in 0.2s ease',
    }}>
      {ok ? <IconCheck size={14} color="var(--green)" /> : <IconAlertCircle size={14} color="var(--red)" />}
      <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{msg}</span>
      <button className="btn-icon" onClick={onClose}><IconX size={12} /></button>
    </div>
  );
}

/* ─── Unsupported section ─────────────────────────────────────────────────── */
function UnsupportedSection({ reason }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(248,81,73,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconAlertCircle size={22} color="var(--red)" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Función no disponible</p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 340 }}>{reason}</p>
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────────────────── */
function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: 'var(--text-muted)' }}>
      <div className="spinner" /> Conectando a OLT vía Telnet...
    </div>
  );
}

/* ─── Raw output viewer ───────────────────────────────────────────────────── */
function RawOutput({ raw, label = 'Output CLI' }) {
  const [show, setShow] = useState(false);
  if (!raw) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <button className="btn" style={{ fontSize: 11 }} onClick={() => setShow(v => !v)}>
        <IconTerminal2 size={12} /> {show ? 'Ocultar' : 'Ver'} output CLI
      </button>
      {show && (
        <pre className="mono" style={{
          marginTop: 8, padding: 12, background: '#0d1117',
          border: '1px solid var(--border)', borderRadius: 6,
          fontSize: 11, color: 'var(--green)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto',
        }}>{raw}</pre>
      )}
    </div>
  );
}

/* ─── SISTEMA tab ─────────────────────────────────────────────────────────── */
function SystemTab({ oltId, notify }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'system'],
    queryFn: () => oltAPI.config(oltId, 'system').then(r => r.data?.data),
    staleTime: 0,
  });

  const [hostname, setHostname] = useState('');
  React.useEffect(() => { if (data?.hostname) setHostname(data.hostname); }, [data?.hostname]);

  const mut = useMutation({
    mutationFn: ({ action, params }) => oltAPI.configWrite(oltId, 'system', action, params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'system']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Información del equipo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['Marca', data.brand], ['Modelo', data.model], ['IP', data.ip]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{k}</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{v || '—'}</div>
            </div>
          ))}
        </div>
        <RawOutput raw={data.raw} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Hostname</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input-base" style={{ maxWidth: 280 }} value={hostname} onChange={e => setHostname(e.target.value)} placeholder="hostname" />
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate({ action: 'hostname', params: { hostname } })}>
            {mut.isPending ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Save configuration</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Escribe la running-config a la startup-config del equipo.</p>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate({ action: 'save', params: {} })}>
          <IconDeviceFloppy size={13} /> Guardar en OLT (write)
        </button>
      </div>
    </div>
  );
}

/* ─── VLANS tab ───────────────────────────────────────────────────────────── */
function VlansTab({ oltId, notify }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'vlans'],
    queryFn: () => oltAPI.config(oltId, 'vlans').then(r => r.data?.data),
    staleTime: 0,
  });
  const [form, setForm] = useState({ vlan_id: '', name: '' });
  const mut = useMutation({
    mutationFn: ({ action, params }) => oltAPI.configWrite(oltId, 'vlans', action, params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'vlans']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  const vlans = data?.vlans || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>VLANs activas ({vlans.length})</span>
          <button className="btn" style={{ fontSize: 11 }} onClick={() => qc.invalidateQueries(['olt-config', oltId, 'vlans'])}>
            <IconRefresh size={12} /> Actualizar
          </button>
        </div>
        {vlans.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            {isLoading ? '' : 'No se pudieron leer las VLANs. Ver output CLI para detalle.'}
          </p>
        ) : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Ports</th><th></th></tr></thead>
            <tbody>
              {vlans.map(v => (
                <tr key={v.id}>
                  <td><span className="mono" style={{ color: 'var(--cyan)' }}>{v.id}</span></td>
                  <td><span style={{ fontSize: 12 }}>{v.name}</span></td>
                  <td><span style={{ fontSize: 11, color: v.status === 'active' ? 'var(--green)' : 'var(--text-muted)' }}>{v.status}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.ports || '—'}</span></td>
                  <td>
                    {v.id !== 1 && (
                      <button className="btn-icon" style={{ color: 'var(--red)' }} disabled={mut.isPending}
                        onClick={() => { if (confirm(`¿Eliminar VLAN ${v.id}?`)) mut.mutate({ action: 'delete', params: { vlan_id: v.id } }); }}>
                        <IconTrash size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <RawOutput raw={data?.raw} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Add VLAN</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>ID *</label>
            <input className="input-base" style={{ width: 100 }} type="number" placeholder="100" value={form.vlan_id} onChange={e => setForm(f => ({ ...f, vlan_id: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Name</label>
            <input className="input-base" style={{ width: 180 }} placeholder="Management" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <button className="btn btn-primary" disabled={!form.vlan_id || mut.isPending}
            onClick={() => { mut.mutate({ action: 'add', params: { vlan_id: parseInt(form.vlan_id), name: form.name } }); setForm({ vlan_id: '', name: '' }); }}>
            <IconPlus size={13} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RUTAS tab ───────────────────────────────────────────────────────────── */
function RoutesTab({ oltId, notify }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'routes'],
    queryFn: () => oltAPI.config(oltId, 'routes').then(r => r.data?.data),
    staleTime: 0,
  });
  const [form, setForm] = useState({ dest: '', mask: '255.255.255.0', gateway: '' });
  const mut = useMutation({
    mutationFn: ({ action, params }) => oltAPI.configWrite(oltId, 'routes', action, params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'routes']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  const routes = data?.routes || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tabla de rutas ({routes.length})</span>
          <button className="btn" style={{ fontSize: 11 }} onClick={() => qc.invalidateQueries(['olt-config', oltId, 'routes'])}>
            <IconRefresh size={12} /> Actualizar
          </button>
        </div>
        {routes.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No se encontraron rutas. Ver output CLI.</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>Destino</th><th>Gateway</th><th>Interfaz</th><th></th></tr></thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={i}>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{r.dest}</span></td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{r.gateway || '—'}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.iface || '—'}</span></td>
                  <td>
                    <button className="btn-icon" style={{ color: 'var(--red)' }} disabled={mut.isPending}
                      onClick={() => { if (confirm(`¿Eliminar ruta ${r.dest}?`)) mut.mutate({ action: 'delete', params: { dest: r.dest.split('/')[0], mask: '0.0.0.0', gateway: r.gateway } }); }}>
                      <IconTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <RawOutput raw={data?.raw} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Add route</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[['Destino', 'dest', '0.0.0.0', 120], ['Máscara', 'mask', '255.255.255.0', 140], ['Gateway', 'gateway', '192.168.1.1', 140]].map(([lbl, key, ph, w]) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{lbl} *</label>
              <input className="input-base" style={{ width: w }} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <button className="btn btn-primary" disabled={!form.dest || !form.gateway || mut.isPending}
            onClick={() => { mut.mutate({ action: 'add', params: form }); setForm({ dest: '', mask: '255.255.255.0', gateway: '' }); }}>
            <IconPlus size={13} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SNMP tab ────────────────────────────────────────────────────────────── */
function SnmpTab({ oltId, notify }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'snmp'],
    queryFn: () => oltAPI.config(oltId, 'snmp').then(r => r.data?.data),
    staleTime: 0,
  });
  const [form, setForm] = useState({ community: '', trapHost: '', contact: '', location: '' });
  React.useEffect(() => { if (data) setForm({ community: data.community || '', trapHost: data.trapHost || '', contact: data.contact || '', location: data.location || '' }); }, [data]);

  const mut = useMutation({
    mutationFn: (params) => oltAPI.configWrite(oltId, 'snmp', 'set', params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'snmp']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  return (
    <div className="card" style={{ padding: 20, maxWidth: 520 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Configuración SNMP</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['Community (read-only)', 'community', 'public'], ['Trap Host', 'trapHost', '10.0.0.100'], ['Contact', 'contact', 'admin@empresa.com'], ['Location', 'location', 'Data Center']].map(([lbl, key, ph]) => (
          <div key={key}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{lbl}</label>
            <input className="input-base" placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={mut.isPending} onClick={() => mut.mutate(form)}>
        {mut.isPending ? 'Aplicando...' : 'Aplicar en OLT'}
      </button>
    </div>
  );
}

/* ─── PON tab ─────────────────────────────────────────────────────────────── */
function PonTab({ oltId, notify }) {
  const qc = useQueryClient();
  const [selPort, setSelPort] = useState(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'pon'],
    queryFn: () => oltAPI.config(oltId, 'pon').then(r => r.data?.data),
    staleTime: 0,
  });

  const mut = useMutation({
    mutationFn: ({ action, params }) => oltAPI.configWrite(oltId, 'pon', action, params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'pon']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  const ports = Object.keys(data?.ports || {});
  const activePort = selPort || ports[0];
  const portData = data?.ports?.[activePort] || { onus: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Port tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {ports.map(p => (
          <button key={p} className={`btn${activePort === p ? ' btn-primary' : ''}`} onClick={() => setSelPort(p)}>
            PON 0/{p}
          </button>
        ))}
        <button className="btn" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => qc.invalidateQueries(['olt-config', oltId, 'pon'])}>
          <IconRefresh size={12} /> Actualizar
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>ONUs en puerto PON 0/{activePort} ({portData.onus.length})</span>
        </div>
        {portData.onus.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No se encontraron ONUs. Ver output CLI.</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Serial</th><th>Status</th><th>RX (dBm)</th><th>Actions</th></tr></thead>
            <tbody>
              {portData.onus.map(o => (
                <tr key={o.id}>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{o.id}</span></td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{o.sn}</span></td>
                  <td>
                    <span style={{ fontSize: 11, color: o.status?.toLowerCase() === 'online' ? 'var(--green)' : 'var(--red)' }}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: o.rx != null ? (o.rx < -27 ? 'var(--red)' : o.rx < -24 ? 'var(--orange)' : 'var(--green)') : 'var(--text-muted)' }}>
                      {o.rx != null ? `${o.rx} dBm` : '—'}
                    </span>
                  </td>
                  <td>
                    <button className="btn" style={{ fontSize: 11 }} disabled={mut.isPending}
                      onClick={() => { if (confirm(`¿Reiniciar ONU ${o.sn}?`)) mut.mutate({ action: 'onu_reboot', params: { port: activePort, onu_id: o.id } }); }}>
                      Reboot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <RawOutput raw={portData.raw} />
      </div>
    </div>
  );
}

/* ─── PERFILES tab ────────────────────────────────────────────────────────── */
function ProfilesTab({ oltId, notify }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['olt-config', oltId, 'profiles'],
    queryFn: () => oltAPI.config(oltId, 'profiles').then(r => r.data?.data),
    staleTime: 0,
  });
  const [form, setForm] = useState({ id: '', name: '', type: '4', max_kbps: '' });
  const mut = useMutation({
    mutationFn: ({ action, params }) => oltAPI.configWrite(oltId, 'profiles', action, params).then(r => r.data?.data),
    onSuccess: (res) => { notify(res?.ok ? 'Aplicado correctamente' : (res?.error || 'Error'), res?.ok); qc.invalidateQueries(['olt-config', oltId, 'profiles']); },
    onError: (e) => notify(e.response?.data?.error || e.message, false),
  });

  if (!data?.supported) return <UnsupportedSection reason={data?.reason || ''} />;
  if (isLoading) return <Loading />;
  if (error) return <p style={{ color: 'var(--red)', padding: 24, fontSize: 13 }}>Error: {error.message}</p>;

  const DBA_TYPES = { 1: 'Fixed', 2: 'Assured', 3: 'Assured+Max', 4: 'Best Effort', 5: 'Assured+BE' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Perfiles DBA ({(data?.dba || []).length})</span>
        </div>
        {(data?.dba || []).length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No se encontraron perfiles DBA. Ver output CLI.</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Max (kbps)</th><th></th></tr></thead>
            <tbody>
              {(data.dba || []).map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{p.id}</span></td>
                  <td><span style={{ fontSize: 12 }}>{p.name}</span></td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{DBA_TYPES[p.type] || p.type}</span></td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{p.max_kbps?.toLocaleString()}</span></td>
                  <td>
                    <button className="btn-icon" style={{ color: 'var(--red)' }} disabled={mut.isPending}
                      onClick={() => { if (confirm(`¿Eliminar perfil DBA ${p.id}?`)) mut.mutate({ action: 'dba.delete', params: { id: p.id } }); }}>
                      <IconTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <RawOutput raw={data?.rawDba} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>New DBA profile</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[['ID', 'id', '10', 60], ['Nombre', 'name', '10Mbps', 140], ['Máx. kbps', 'max_kbps', '10000', 100]].map(([lbl, key, ph, w]) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{lbl} *</label>
              <input className="input-base" style={{ width: w }} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select className="select-base" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {Object.entries(DBA_TYPES).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" disabled={!form.id || !form.name || !form.max_kbps || mut.isPending}
            onClick={() => { mut.mutate({ action: 'dba.add', params: { ...form, id: parseInt(form.id), max_kbps: parseInt(form.max_kbps) } }); setForm({ id: '', name: '', type: '4', max_kbps: '' }); }}>
            <IconPlus size={13} /> Agregar
          </button>
        </div>
      </div>

      {(data?.srv || []).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Perfiles de Servicio ({data.srv.length})</span>
          </div>
          <table className="table-base">
            <thead><tr><th>ID</th><th>Name</th></tr></thead>
            <tbody>{data.srv.map(p => <tr key={p.id}><td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{p.id}</span></td><td><span style={{ fontSize: 12 }}>{p.name}</span></td></tr>)}</tbody>
          </table>
          <RawOutput raw={data?.rawSrv} />
        </div>
      )}
    </div>
  );
}

/* ─── Tab definitions ─────────────────────────────────────────────────────── */
const TABS = [
  { id: 'system',   label: 'Sistema',      icon: IconSettings,    component: SystemTab },
  { id: 'vlans',    label: 'VLANs',        icon: IconNetwork,     component: VlansTab },
  { id: 'pon',      label: 'Puertos PON',  icon: IconCpu,         component: PonTab },
  { id: 'profiles', label: 'Perfiles DBA', icon: IconChevronRight, component: ProfilesTab },
  { id: 'routes',   label: 'IP / Rutas',   icon: IconRouter,      component: RoutesTab },
  { id: 'snmp',     label: 'SNMP',         icon: IconBell,        component: SnmpTab },
  { id: 'tr069',    label: 'TR-069',       icon: IconCloud,       component: null, unsupported: true },
  { id: 'gps',      label: 'GPS',          icon: IconMapPin,      component: null, unsupported: true },
];

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function OLTConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('system');
  const [toast, setToast] = useState(null);

  const { data: oltData } = useQuery({
    queryKey: ['olts'],
    queryFn: () => oltAPI.list().then(r => r.data?.data || r.data),
    staleTime: 60000,
    select: (list) => (list || []).find(o => o.id === id),
  });

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const tab = TABS.find(t => t.id === activeTab);
  const TabComponent = tab?.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 20,
      }}>
        <button className="btn-icon" onClick={() => navigate('/olts')} style={{ color: 'var(--text-secondary)' }}>
          <IconArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <IconSettings size={16} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Configuración OLT
          </span>
          {oltData && (
            <>
              <span style={{ color: 'var(--border)' }}>—</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{oltData.name}</span>
              <BrandTag brand={oltData.brand} />
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{oltData.ip}</span>
            </>
          )}
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? 'rgba(31,111,235,.15)' : 'transparent',
                  color: active ? 'var(--accent)' : t.unsupported ? 'var(--text-muted)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {t.label}
                {t.unsupported && (
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', background: 'var(--border)', padding: '1px 5px', borderRadius: 10 }}>
                    N/D
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab?.unsupported ? (
            <UnsupportedSection reason={
              tab.id === 'tr069' ? 'TR-069 ACS no disponible en VSOL V1600G1' :
              tab.id === 'gps'   ? 'GPS / ubicación no disponible en VSOL V1600G1' :
              'Función no disponible en este modelo'
            } />
          ) : TabComponent ? (
            <TabComponent key={activeTab} oltId={id} notify={notify} />
          ) : null}
        </div>
      </div>

      <Toast msg={toast?.msg} ok={toast?.ok} onClose={() => setToast(null)} />
    </div>
  );
}
