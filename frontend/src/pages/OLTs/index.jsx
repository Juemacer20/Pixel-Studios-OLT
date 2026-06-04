import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { oltAPI } from '../../services/api';
import BrandTag from '../../components/shared/BrandTag';
import OLTTerminal from '../../components/olts/OLTTerminal';
import {
  IconPencil, IconRefresh, IconTrash, IconTerminal2,
  IconPlus, IconX, IconChevronDown, IconChevronRight,
  IconServer, IconWifi, IconWifiOff, IconAlertTriangle,
  IconCpu, IconCloudDownload, IconSettings, IconDownload, IconEye,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

/* ─── Mock data (fallback when API unavailable) ─────────────────────────── */


const BRANDS = ['Huawei', 'KingType', 'VSOL', 'ZTE', 'Nokia'];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatusDotOLT({ status }) {
  const s = (status || '').toUpperCase();
  const isOnline = s === 'ONLINE';
  const isDegraded = s === 'DEGRADED';
  const color = isOnline ? 'var(--green)' : isDegraded ? 'var(--orange)' : 'var(--text-muted)';
  const label = isOnline ? 'Online' : isDegraded ? 'Degraded' : 'Offline';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`status-dot ${isOnline ? 'status-online' : isDegraded ? 'status-warning' : 'status-offline'}`} />
      <span style={{ fontSize: 11, color }}>{label}</span>
    </span>
  );
}

function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const s = Number(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return `${d}d ${h}h`;
}

function CpuBar({ value }) {
  const color = value > 80 ? 'var(--red)' : value > 50 ? 'var(--orange)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span className="mono" style={{ color, fontSize: 11 }}>{value}%</span>
    </div>
  );
}

function OLTModal({ olt, onClose, onSave }) {
  const [form, setForm] = useState({
    name: olt?.name || '',
    ip: olt?.ip || '',
    port: olt?.port || 161,
    community: olt?.community || 'public',
    brand: olt?.brand || 'Huawei',
    model: olt?.model || '',
    location: olt?.location || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.ip.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--card-bg)', border: '1px solid var(--border-light)',
          borderRadius: 8, width: 460, zIndex: 300, padding: 24,
          animation: 'fade-in 0.15s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {olt ? 'Edit OLT' : 'Add OLT'}
          </h3>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Name *</label>
            <input className="input-base" value={form.name} onChange={e => set('name', e.target.value)} placeholder="OLT-NORTE" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>IP *</label>
            <input className="input-base" value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="192.168.1.10" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>SNMP Port</label>
              <input className="input-base" type="number" value={form.port} onChange={e => set('port', +e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>SNMP Community</label>
              <input className="input-base" value={form.community} onChange={e => set('community', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Brand</label>
              <select className="select-base" style={{ width: '100%' }} value={form.brand} onChange={e => set('brand', e.target.value)}>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Model</label>
              <input className="input-base" value={form.model} onChange={e => set('model', e.target.value)} placeholder="MA5800-X7" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Location</label>
            <input className="input-base" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Main Data Center" />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.ip.trim()}
            style={{ opacity: saving || !form.name.trim() || !form.ip.trim() ? 0.6 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar OLT'}
          </button>
        </div>
      </div>
    </>
  );
}

function PortsSubTable({ oltId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['olt-ports', oltId],
    queryFn: () => oltAPI.ports(oltId).then(r => r.data?.data || r.data),
    staleTime: 30000,
  });

  const ports = data || [];

  return (
    <tr>
      <td colSpan={10} style={{ padding: 0, background: 'var(--content-bg)' }}>
        <div style={{ padding: '12px 24px 12px 40px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Puertos PON
          </p>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              <div className="spinner" style={{ width: 12, height: 12 }} /> Loading ports...
            </div>
          ) : (
            <table className="table-base" style={{ maxWidth: 600 }}>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Status</th>
                  <th>ONUs</th>
                </tr>
              </thead>
              <tbody>
                {ports.map(p => (
                  <tr key={p.id}>
                    <td><span className="mono">{p.port_number}</span></td>
                    <td>
                      <span className={`status-dot ${p.status === 'online' ? 'status-online' : 'status-offline'}`}
                        style={{ display: 'inline-block', marginRight: 6 }} />
                      <span style={{ fontSize: 11, color: p.status === 'online' ? 'var(--green)' : 'var(--text-muted)' }}>
                        {p.status}
                      </span>
                    </td>
                    <td><span style={{ color: 'var(--cyan)', fontFamily: 'monospace' }}>{p.ont_count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function OLTs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOlt, setModalOlt] = useState(null);   // null=closed, false=new, obj=edit
  const [expandedId, setExpandedId] = useState(null);
  const [terminalOlt, setTerminalOlt] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  /* ── Data fetching ── */
  const { data, isLoading } = useQuery({
    queryKey: ['olts'],
    queryFn: () => oltAPI.list().then(r => r.data?.data || r.data),
    staleTime: 30000,
  });
  const olts = data || [];

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (form) => oltAPI.create(form).catch(() => ({ data: { ...form, id: Date.now(), status: 'offline', ont_count: 0, cpu_usage: 0, uptime: '0d 0h', pon_ports: 0 } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['olts'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }) => oltAPI.update(id, form).catch(() => ({ data: { id, ...form } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['olts'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => oltAPI.delete(id).catch(() => ({})),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['olts'] }),
  });

  /* ── Stats ── */
  const total   = olts.length;
  const online  = olts.filter(o => (o.status || '').toUpperCase() === 'ONLINE').length;
  const offline = olts.filter(o => (o.status || '').toUpperCase() === 'OFFLINE').length;
  const alerts  = olts.filter(o => o.cpu_usage > 70).length;
  const totalONTs = olts.reduce((s, o) => s + (o._count?.onts || o.ont_count || 0), 0);

  /* ── Handlers ── */
  const handleSave = async (form) => {
    if (modalOlt && modalOlt.id) {
      await updateMut.mutateAsync({ id: modalOlt.id, form });
    } else {
      await createMut.mutateAsync(form);
    }
  };

  const handleDelete = (olt) => {
    if (!confirm(`Delete ${olt.name}? This only removes it from the platform (no changes on the OLT).`)) return;
    deleteMut.mutate(olt.id);
  };

  // Export OLTs list a CSV (solo lectura de la plataforma, no toca la OLT)
  const exportOlts = () => {
    const cols = ['id', 'name', 'status', 'ip', 'tcp_port', 'udp_port', 'hw_version', 'sw_version'];
    const rows = olts.map((o, i) => [i + 1, o.name, o.status, o.ip || o.host, o.tcp_port ?? '', o.udp_port ?? '', o.hw_version ?? o.model ?? '', o.sw_version ?? '']);
    const csv = [['#', ...cols.slice(1)].join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'olts.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('OLTs list exported');
  };

  const handlePoll = async (olt) => {
    setPollingId(olt.id);
    try {
      await oltAPI.status(olt.id).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ['olts'] });
    } finally {
      setTimeout(() => setPollingId(null), 1200);
    }
  };

  const handleSync = async (olt) => {
    setSyncingId(olt.id);
    setSyncResult(null);
    try {
      const res = await oltAPI.scan(olt.id);
      const { scanned, saved } = res.data?.data || {};
      setSyncResult({ oltName: olt.name, scanned, saved });
      await queryClient.invalidateQueries({ queryKey: ['olts'] });
      await queryClient.invalidateQueries({ queryKey: ['onts'] });
    } catch (e) {
      setSyncResult({ oltName: olt.name, error: true });
    } finally {
      setSyncingId(null);
    }
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Toolbar (estilo SmartOLT) ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setModalOlt(false)}>
          <IconPlus size={14} /> Add OLT
        </button>
        <button className="btn btn-success" onClick={exportOlts}>
          <IconDownload size={14} /> Export OLTs list
        </button>
        <button className="btn" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}
          onClick={() => toast('Find config mismatches — próximamente')}>
          <IconAlertTriangle size={14} /> Find config mismatches
        </button>
      </div>

      {/* ── Table card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: 'var(--text-muted)' }}>
            <div className="spinner" /> Loading OLTs...
          </div>
        ) : olts.length === 0 ? (
          <div className="empty-state">
            <IconServer size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <p>No OLTs registered</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOlt(false)}>
              <IconPlus size={13} /> Add first OLT
            </button>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th style={{ width: 64, textAlign: 'center' }}>View</th>
                <th style={{ width: 40, textAlign: 'center' }}>ID</th>
                <th>Status</th>
                <th>Name</th>
                <th>OLT IP</th>
                <th style={{ textAlign: 'center' }}>TCP</th>
                <th style={{ textAlign: 'center' }}>UDP</th>
                <th>OLT hardware version</th>
                <th>OLT SW version</th>
                <th style={{ textAlign: 'center', width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {olts.map((olt, i) => (
                <tr key={olt.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-primary" style={{ padding: '3px 12px', fontSize: 11 }}
                      onClick={() => navigate(`/olts/${olt.id}/config`)}>
                      <IconEye size={12} /> View
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</span>
                  </td>
                  <td><StatusDotOLT status={olt.status} /></td>
                  <td><span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{olt.name}</span></td>
                  <td><span className="mono" style={{ color: 'var(--text-secondary)' }}>{olt.ip || olt.host}</span></td>
                  <td style={{ textAlign: 'center' }}><span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{olt.tcp_port ?? '—'}</span></td>
                  <td style={{ textAlign: 'center' }}><span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{olt.udp_port ?? '—'}</span></td>
                  <td><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{olt.hw_version || olt.model || '—'}</span></td>
                  <td><span className="badge badge-blue">{olt.sw_version || '—'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button className="btn-icon tooltip" data-tip="Edit"
                        onClick={() => setModalOlt(olt)}>
                        <IconPencil size={13} />
                      </button>
                      <button className="btn-icon tooltip" data-tip="Delete"
                        onClick={() => handleDelete(olt)}
                        style={{ color: 'var(--red)', borderColor: 'rgba(224,80,79,0.3)' }}>
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CREATE/EDIT Modal ── */}
      {modalOlt !== null && (
        <OLTModal
          olt={modalOlt || null}
          onClose={() => setModalOlt(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Sync result toast ── */}
      {syncResult && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          background: syncResult.error ? 'var(--red)' : 'var(--card-bg)',
          border: `1px solid ${syncResult.error ? 'rgba(248,81,73,0.5)' : 'var(--border-light)'}`,
          borderRadius: 8, padding: '12px 16px', minWidth: 260,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          animation: 'fade-in 0.2s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {syncResult.error ? `Error sincronizando ${syncResult.oltName}` : `Sincronización completa — ${syncResult.oltName}`}
            </p>
            {!syncResult.error && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {syncResult.scanned} ONUs detectadas · {syncResult.saved} guardadas
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={() => setSyncResult(null)}><IconX size={12} /></button>
        </div>
      )}

      {/* ── Terminal Drawer ── */}
      {terminalOlt && (
        <>
          <div className="drawer-overlay" onClick={() => setTerminalOlt(null)} />
          <div
            className="drawer-panel"
            style={{ width: 640 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconTerminal2 size={15} style={{ color: 'var(--green)' }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Terminal — {terminalOlt.name}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{terminalOlt.host}</span>
              </div>
              <button className="btn-icon" onClick={() => setTerminalOlt(null)}><IconX size={14} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <OLTTerminal olt={terminalOlt} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
