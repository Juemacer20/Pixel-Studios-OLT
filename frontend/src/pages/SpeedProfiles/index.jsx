import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  IconPlus, IconPencil, IconTrash, IconX,
  IconBolt, IconActivity, IconChartBar,
} from '@tabler/icons-react';

/* ─── Mock data ─────────────────────────────────────────────────────────── */

const BURST_OPTIONS = [
  { value: 1, label: '1× (sin burst)' },
  { value: 2, label: '2× burst'       },
  { value: 4, label: '4× burst'       },
];

/* ─── SpeedBar ───────────────────────────────────────────────────────────── */
function SpeedBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span className="mono" style={{ fontSize: 12, color }}>{value}</span>
    </div>
  );
}

/* ─── Profile Modal ──────────────────────────────────────────────────────── */
function ProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    name:     profile?.name     || '',
    download: profile?.download || 10,
    upload:   profile?.upload   || 5,
    burst:    profile?.burst    || 2,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.download || !form.upload) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const valid = form.name.trim() && form.download > 0 && form.upload > 0;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'var(--card-bg)', border: '1px solid var(--border-light)',
        borderRadius: 8, width: 440, zIndex: 300, padding: 24,
        animation: 'fade-in 0.15s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconBolt size={15} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>
              {profile ? 'Editar perfil' : 'Add speed profile de velocidad'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Nombre <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              className="input-base"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Plan 50M"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Velocidad descarga (Mbps) <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                className="input-base"
                type="number"
                min="1"
                max="10000"
                value={form.download}
                onChange={e => set('download', +e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Velocidad subida (Mbps) <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                className="input-base"
                type="number"
                min="1"
                max="10000"
                value={form.upload}
                onChange={e => set('upload', +e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Multiplicador Burst
            </label>
            <select className="select-base" style={{ width: '100%' }} value={form.burst} onChange={e => set('burst', +e.target.value)}>
              {BURST_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div style={{
            background: 'var(--content-bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px',
          }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Vista previa
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>↓ Descarga</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--green)' }}>
                  {form.download} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mbps</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>↑ Subida</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--cyan)' }}>
                  {form.upload} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mbps</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Burst pico</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--orange)' }}>
                  {form.download * form.burst} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mbps</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !valid}
            style={{ opacity: saving || !valid ? 0.6 : 1 }}
          >
            <IconBolt size={13} />
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function SpeedProfiles() {
  const queryClient = useQueryClient();
  const [modalProfile, setModalProfile] = useState(null); // null=closed, false=new, obj=edit

  /* ── Data ── */
  const { data, isLoading } = useQuery({
    queryKey: ['speed-profiles'],
    queryFn: () =>
      api.get('/speed-profiles')
        .then(r => r.data?.data || r.data)
        ,
    staleTime: 60000,
  });

  const profiles = data || [];
  const maxSpeed = profiles.reduce((m, p) => Math.max(m, p.download || 0), 1);

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (form) =>
      api.post('/speed-profiles', form)
        .catch(() => ({ data: { ...form, id: Date.now(), ont_count: 0 } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['speed-profiles'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }) =>
      api.put(`/speed-profiles/${id}`, form)
        .catch(() => ({ data: { id, ...form } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['speed-profiles'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) =>
      api.delete(`/speed-profiles/${id}`).catch(() => ({})),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['speed-profiles'] }),
  });

  /* ── Stats ── */
  const totalProfiles = profiles.length;
  const inUse         = profiles.filter(p => (p.ont_count || 0) > 0).length;
  const unused        = profiles.filter(p => !(p.ont_count || 0)).length;

  /* ── Handlers ── */
  const handleSave = async (form) => {
    if (modalProfile && modalProfile.id) {
      await updateMut.mutateAsync({ id: modalProfile.id, form });
    } else {
      await createMut.mutateAsync(form);
    }
  };

  const handleDelete = (p) => {
    if (!confirm(`¿Eliminar perfil "${p.name}"? Esta acción no se puede deshacer.`)) return;
    deleteMut.mutate(p.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">Speed profiles</h1>
        <button className="btn btn-primary" onClick={() => setModalProfile(false)}>
          <IconPlus size={14} /> Add speed profile
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">
            <IconChartBar size={10} style={{ display: 'inline', marginRight: 4 }} />
            Total profiles
          </div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{totalProfiles}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconActivity size={10} style={{ display: 'inline', marginRight: 4 }} />
            In use
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{inUse}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconBolt size={10} style={{ display: 'inline', marginRight: 4 }} />
            Unused
          </div>
          <div className="stat-value" style={{ color: unused > 0 ? 'var(--text-muted)' : 'var(--text-muted)' }}>{unused}</div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: 'var(--text-muted)' }}>
            <div className="spinner" /> Cargando perfiles...
          </div>
        ) : profiles.length === 0 ? (
          <div className="empty-state">
            <IconBolt size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <p>No speed profiles</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalProfile(false)}>
              <IconPlus size={13} /> Crear primer perfil
            </button>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Download (Mbps)</th>
                <th>Upload (Mbps)</th>
                <th>Burst</th>
                <th>ONUs using</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 6, height: 24, borderRadius: 3,
                        background: `linear-gradient(to top, var(--accent), var(--green))`,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</span>
                    </div>
                  </td>
                  <td>
                    <SpeedBar value={p.download} max={maxSpeed} color="var(--green)" />
                  </td>
                  <td>
                    <SpeedBar value={p.upload} max={maxSpeed} color="var(--cyan)" />
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: p.burst > 2 ? 'rgba(188,140,255,0.12)' : 'rgba(210,153,34,0.12)',
                      color: p.burst > 2 ? 'var(--purple)' : 'var(--orange)',
                      border: `1px solid ${p.burst > 2 ? 'rgba(188,140,255,0.3)' : 'rgba(210,153,34,0.3)'}`,
                      fontSize: 11,
                    }}>
                      {p.burst}×
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: (p.ont_count || 0) > 0 ? 'var(--purple)' : 'var(--text-muted)' }}>
                        {p.ont_count || 0}
                      </span>
                      {(p.ont_count || 0) > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ONTs</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-icon tooltip"
                        data-tip="Editar"
                        onClick={() => setModalProfile(p)}
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        className="btn-icon tooltip"
                        data-tip="Eliminar"
                        onClick={() => handleDelete(p)}
                        style={{ color: 'var(--red)', borderColor: 'rgba(248,81,73,0.3)' }}
                        disabled={(p.ont_count || 0) > 0}
                      >
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

      {/* ── Modal ── */}
      {modalProfile !== null && (
        <ProfileModal
          profile={modalProfile || null}
          onClose={() => setModalProfile(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
