import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ztpAPI } from '../../services/api';
import {
  IconCheck, IconX, IconShieldCheck, IconBan,
  IconClock, IconAlertTriangle, IconRefresh,
} from '@tabler/icons-react';

const WAN_MODES = ['DHCP', 'PPPoE', 'Static'];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function relativeTime(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

/* ─── Authorize Modal ────────────────────────────────────────────────────── */
function AuthorizeModal({ ont, profiles, onClose, onAuthorize }) {
  const [form, setForm] = useState({
    client: '',
    profileId: profiles[0]?.id || '',
    vlan: '',
    wan_mode: 'DHCP',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.profileId) return;
    setSaving(true);
    try {
      await onAuthorize(ont.id, form.profileId, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'var(--card-bg)', border: '1px solid var(--border-light)',
        borderRadius: 8, width: 480, zIndex: 300, padding: 24,
        animation: 'fade-in 0.15s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconShieldCheck size={16} style={{ color: 'var(--green)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Autorizar ONT</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>

        {/* ONT info banner */}
        <div style={{
          background: 'rgba(31,111,235,0.08)', border: '1px solid rgba(31,111,235,0.2)',
          borderRadius: 6, padding: '10px 12px', marginBottom: 18,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Serial</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600 }}>{ont.serial_number}</span>
          </div>
          <div style={{ display: 'flex', gap: 30 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>MAC</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ont.mac}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>OLT / Puerto</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ont.olt} — {ont.port}</span>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cliente</label>
            <input
              className="input-base"
              value={form.client}
              onChange={e => set('client', e.target.value)}
              placeholder="Nombre o ID de cliente..."
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Perfil de velocidad <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select
              className="select-base"
              style={{ width: '100%' }}
              value={form.profileId}
              onChange={e => set('profileId', e.target.value)}
            >
              <option value="">Seleccionar perfil...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ↓{p.download}Mbps / ↑{p.upload}Mbps
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>VLAN ID</label>
              <input
                className="input-base"
                type="number"
                value={form.vlan}
                onChange={e => set('vlan', e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Modo WAN</label>
              <select className="select-base" style={{ width: '100%' }} value={form.wan_mode} onChange={e => set('wan_mode', e.target.value)}>
                {WAN_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Descripción</label>
            <input
              className="input-base"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Notas opcionales..."
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || !form.profileId}
            style={{ opacity: saving || !form.profileId ? 0.6 : 1 }}
          >
            <IconShieldCheck size={13} />
            {saving ? 'Autorizando...' : 'Autorizar ONT'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Batch Authorize Bar ────────────────────────────────────────────────── */
function BatchBar({ count, profiles, onAuthorize, onClear }) {
  const [profileId, setProfileId] = useState(profiles[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const handleBatch = async () => {
    if (!profileId) return;
    setLoading(true);
    try { await onAuthorize(profileId); }
    finally { setLoading(false); }
  };

  return (
    <div className="batch-bar">
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{count}</span> seleccionados
      </span>
      <select
        className="select-base"
        style={{ fontSize: 12, padding: '3px 8px' }}
        value={profileId}
        onChange={e => setProfileId(e.target.value)}
      >
        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button
        className="btn btn-primary"
        style={{ fontSize: 12, padding: '4px 10px' }}
        onClick={handleBatch}
        disabled={loading || !profileId}
      >
        <IconShieldCheck size={12} />
        {loading ? 'Autorizando...' : 'Autorizar seleccionados'}
      </button>
      <button className="btn-icon" onClick={onClear}><IconX size={13} /></button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ZTP() {
  const queryClient = useQueryClient();
  const [authorizing, setAuthorizing] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());

  /* ── Data ── */
  const { data: pendingRaw, isLoading: loadingPending } = useQuery({
    queryKey: ['ztp-pending'],
    queryFn: () => ztpAPI.pending().then(r => r.data?.data || r.data),
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const { data: profilesRaw } = useQuery({
    queryKey: ['ztp-profiles'],
    queryFn: () => ztpAPI.profiles().then(r => r.data?.data || r.data),
    staleTime: 60000,
  });

  const pending  = pendingRaw  || [];
  const profiles = profilesRaw || [];

  // Filter out locally rejected
  const visiblePending = pending.filter(o => !rejected.has(o.id));

  /* ── Mutations ── */
  const authMut = useMutation({
    mutationFn: ({ id, profileId }) => ztpAPI.authorize(id, profileId).catch(() => ({})),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp-pending'] }),
  });

  /* ── Stats ── */
  const totalPending   = visiblePending.length;
  const authorizedToday = 0; // would come from API
  const totalProfiles  = profiles.length;
  const rejectedCount  = rejected.size;

  /* ── Handlers ── */
  const handleAuthorize = async (ontId, profileId) => {
    await authMut.mutateAsync({ id: ontId, profileId });
    setSelected(s => { const n = new Set(s); n.delete(ontId); return n; });
  };

  const handleReject = (id) => {
    setRejected(s => new Set([...s, id]));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const handleBatchAuthorize = async (profileId) => {
    await Promise.all([...selected].map(id => authMut.mutateAsync({ id, profileId })));
    setSelected(new Set());
  };

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === visiblePending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visiblePending.map(o => o.id)));
    }
  };

  const allSelected = visiblePending.length > 0 && selected.size === visiblePending.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Zero Touch Provisioning</h1>
          {totalPending > 0 && (
            <span className="badge badge-orange" style={{ animation: 'pulse-orange 2s infinite' }}>
              <IconClock size={10} />
              {totalPending} pendiente{totalPending !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          className="btn"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['ztp-pending'] })}
          style={{ fontSize: 12 }}
        >
          <IconRefresh size={13} /> Actualizar
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">
            <IconClock size={10} style={{ display: 'inline', marginRight: 4 }} />
            Pendientes de autorización
          </div>
          <div className="stat-value" style={{ color: totalPending > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>
            {totalPending}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconCheck size={10} style={{ display: 'inline', marginRight: 4 }} />
            Autorizadas hoy
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{authorizedToday}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconShieldCheck size={10} style={{ display: 'inline', marginRight: 4 }} />
            Total perfiles
          </div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{totalProfiles}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconBan size={10} style={{ display: 'inline', marginRight: 4 }} />
            Rechazadas
          </div>
          <div className="stat-value" style={{ color: rejectedCount > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {totalPending > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 6, fontSize: 12,
          background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.25)',
          color: 'var(--orange)',
        }}>
          <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            {totalPending} ONT{totalPending !== 1 ? 's' : ''} detectada{totalPending !== 1 ? 's' : ''} esperando autorización.
            Asigná un perfil para provisionar automáticamente.
          </span>
        </div>
      )}

      {/* ── Pending ONTs table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loadingPending ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: 'var(--text-muted)' }}>
            <div className="spinner" /> Buscando ONTs pendientes...
          </div>
        ) : visiblePending.length === 0 ? (
          <div className="empty-state">
            <IconCheck size={32} style={{ margin: '0 auto 12px', color: 'var(--green)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sin ONTs pendientes</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>
              Cuando se detecte una nueva ONT aparecerá aquí para autorización.
            </p>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 14 }}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>Serial</th>
                <th>MAC</th>
                <th>OLT detectada</th>
                <th>Puerto</th>
                <th>Primera vez visto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visiblePending.map(ont => (
                <tr key={ont.id}>
                  <td style={{ paddingLeft: 14 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.has(ont.id)}
                      onChange={() => toggleSelect(ont.id)}
                    />
                  </td>
                  <td>
                    <span className="mono" style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: 12 }}>
                      {ont.serial_number}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                      {ont.mac}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ont.olt}</span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ont.port}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="status-dot status-pending"
                        style={{ display: 'inline-block', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        hace {relativeTime(ont.first_seen)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => setAuthorizing(ont)}
                      >
                        <IconShieldCheck size={12} /> Autorizar
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => handleReject(ont.id)}
                      >
                        <IconBan size={12} /> Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Batch bar ── */}
      {selected.size > 0 && (
        <BatchBar
          count={selected.size}
          profiles={profiles}
          onAuthorize={handleBatchAuthorize}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* ── Authorize Modal ── */}
      {authorizing && (
        <AuthorizeModal
          ont={authorizing}
          profiles={profiles}
          onClose={() => setAuthorizing(null)}
          onAuthorize={handleAuthorize}
        />
      )}
    </div>
  );
}
