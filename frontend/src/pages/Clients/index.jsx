import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAPI } from '../../services/api';
import {
  IconSearch, IconUser, IconX, IconPencil, IconEye,
  IconPhone, IconMail, IconMapPin, IconNotes,
  IconWifi, IconWifiOff, IconAlertTriangle, IconUsers,
  IconActivity, IconGauge, IconChevronRight,
} from '@tabler/icons-react';

/* ─── Mock alerts (per client) ───────────────────────────────────────────── */
function mockAlerts(clientId) {
  const base = clientId % 4;
  if (base === 0) return [];
  return Array.from({ length: base }, (_, j) => ({
    id: j + 1,
    type: ['LOS', 'CPU_HIGH', 'SIGNAL_LOW'][j % 3],
    message: ['Pérdida de señal óptica', 'Alto uso de CPU', 'Señal por debajo del umbral'][j % 3],
    severity: ['critical', 'warning', 'warning'][j % 3],
    created_at: new Date(Date.now() - (j + 1) * 86400000 * 2).toISOString(),
    resolved: j > 0,
  }));
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function rxColor(rx) {
  if (!rx) return 'var(--text-muted)';
  if (rx >= -20) return 'var(--green)';
  if (rx >= -24) return 'var(--cyan)';
  if (rx >= -27) return 'var(--orange)';
  return 'var(--red)';
}

function rxLabel(rx) {
  if (!rx) return 'N/A';
  if (rx >= -20) return 'Óptima';
  if (rx >= -24) return 'Normal';
  if (rx >= -27) return 'Débil';
  return 'Crítica';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* ─── ONT Status badge ───────────────────────────────────────────────────── */
function ONTStatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>;
  const online = status === 'online';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500,
      color: online ? 'var(--green)' : 'var(--text-muted)',
    }}>
      <span className={`status-dot ${online ? 'status-online' : 'status-offline'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */
function EditClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({
    name:    client?.name    || '',
    email:   client?.email   || '',
    phone:   client?.phone   || '',
    address: client?.address || '',
    notes:   client?.notes   || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'var(--card-bg)', border: '1px solid var(--border-light)',
        borderRadius: 8, width: 460, zIndex: 300, padding: 24,
        animation: 'fade-in 0.15s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPencil size={15} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Editar cliente</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Nombre <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input className="input-base" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
              <input className="input-base" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Teléfono</label>
              <input className="input-base" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0351-1234567" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Dirección</label>
            <input className="input-base" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Calle 123 N° 456" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notas</label>
            <textarea
              className="input-base"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observaciones opcionales..."
              style={{ resize: 'vertical', minHeight: 72 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{ opacity: saving || !form.name.trim() ? 0.6 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Client Drawer ──────────────────────────────────────────────────────── */
function ClientDrawer({ client, onClose, onEdit }) {
  const alerts = useMemo(() => mockAlerts(client.id), [client.id]);
  const ont = client.ont;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ width: 400 }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(31,111,235,0.15)', border: '1px solid rgba(31,111,235,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconUser size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span className={`status-dot ${client.status === 'active' ? 'status-online' : 'status-offline'}`} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => onEdit(client)} data-tip="Editar">
              <IconPencil size={13} />
            </button>
            <button className="btn-icon" onClick={onClose}>
              <IconX size={14} />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Client info */}
          <section>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 10 }}>
              Información del cliente
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconMail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconPhone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <IconMapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client.address}</span>
                </div>
              )}
              {client.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <IconNotes size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{client.notes}</span>
                </div>
              )}
            </div>
          </section>

          {/* ONT vinculada */}
          <section>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 10 }}>
              ONT vinculada
            </p>
            {!ont ? (
              <div style={{
                padding: '14px 16px', borderRadius: 6,
                background: 'var(--content-bg)', border: '1px dashed var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--text-muted)', fontSize: 12,
              }}>
                <IconWifiOff size={14} />
                Sin ONT asignada
              </div>
            ) : (
              <div style={{
                background: 'var(--content-bg)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>
                    {ont.serial_number}
                  </span>
                  <ONTStatusBadge status={ont.status} />
                </div>

                {/* Signal info */}
                {ont.rx_power != null && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px', borderRadius: 4,
                    background: `rgba(${ont.rx_power >= -24 ? '63,185,80' : ont.rx_power >= -27 ? '210,153,34' : '248,81,73'},0.08)`,
                    border: `1px solid rgba(${ont.rx_power >= -24 ? '63,185,80' : ont.rx_power >= -27 ? '210,153,34' : '248,81,73'},0.2)`,
                  }}>
                    <IconGauge size={14} style={{ color: rxColor(ont.rx_power), flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Potencia RX</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: rxColor(ont.rx_power) }}>
                          {ont.rx_power}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>dBm</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: rxColor(ont.rx_power),
                        }}>
                          {rxLabel(ont.rx_power)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Alert history */}
          <section>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 10 }}>
              Historial de alertas
            </p>
            {alerts.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: 6,
                background: 'var(--content-bg)', border: '1px dashed var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--text-muted)', fontSize: 12,
              }}>
                <IconActivity size={14} style={{ color: 'var(--green)' }} />
                Sin alertas registradas
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 10px', borderRadius: 5,
                    background: 'var(--content-bg)', border: '1px solid var(--border)',
                    opacity: a.resolved ? 0.6 : 1,
                  }}>
                    <IconAlertTriangle
                      size={13}
                      style={{
                        color: a.severity === 'critical' ? 'var(--red)' : 'var(--orange)',
                        flexShrink: 0, marginTop: 1,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.message}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(a.created_at)}</span>
                        {a.resolved && (
                          <span className="badge badge-green" style={{ fontSize: 9, padding: '1px 5px' }}>Resuelta</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [editing, setEditing]     = useState(null);

  /* ── Data ── */
  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () =>
      clientAPI.list({ search, limit: 200 })
        .then(r => r.data?.data || r.data)
        ,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const allClients = data || [];

  /* ── Filtered ── */
  const clients = useMemo(() => {
    if (!search.trim()) return allClients;
    const q = search.toLowerCase();
    return allClients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.ont?.serial_number?.toLowerCase().includes(q)
    );
  }, [allClients, search]);

  /* ── Mutations ── */
  const updateMut = useMutation({
    mutationFn: ({ id, form }) => clientAPI.update(id, form).catch(() => ({})),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  /* ── Stats ── */
  const total    = allClients.length;
  const active   = allClients.filter(c => c.status === 'active').length;
  const inactive = allClients.filter(c => c.status !== 'active').length;
  const withOnt  = allClients.filter(c => !!c.ont).length;

  /* ── Handlers ── */
  const handleEdit = (client) => {
    setSelected(null);
    setEditing(client);
  };

  const handleSaveEdit = async (form) => {
    await updateMut.mutateAsync({ id: editing.id, form });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative' }}>
        <IconSearch
          size={15}
          style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}
        />
        <input
          className="input-base"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o serial ONT..."
          style={{ paddingLeft: 32, fontSize: 13, maxWidth: 480 }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: search ? 8 : undefined, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <IconX size={13} />
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">
            <IconUsers size={10} style={{ display: 'inline', marginRight: 4 }} />
            Total clientes
          </div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{total}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconActivity size={10} style={{ display: 'inline', marginRight: 4 }} />
            Activos
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{active}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Inactivos</div>
          <div className="stat-value" style={{ color: inactive > 0 ? 'var(--text-muted)' : 'var(--text-muted)' }}>{inactive}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">
            <IconWifi size={10} style={{ display: 'inline', marginRight: 4 }} />
            Con ONT
          </div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{withOnt}</div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: 'var(--text-muted)' }}>
            <div className="spinner" /> Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <IconUsers size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <p>{search ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}</p>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>ONT vinculada</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c.status === 'active'
                          ? 'rgba(31,111,235,0.12)'
                          : 'rgba(72,79,88,0.3)',
                        border: `1px solid ${c.status === 'active' ? 'rgba(31,111,235,0.25)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconUser size={13} style={{ color: c.status === 'active' ? 'var(--accent)' : 'var(--text-muted)' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.email || '—'}</span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone || '—'}</span>
                  </td>
                  <td>
                    {c.ont ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{c.ont.serial_number}</span>
                        <ONTStatusBadge status={c.ont.status} />
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin ONT</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {c.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-icon tooltip"
                        data-tip="Ver detalle"
                        onClick={() => setSelected(c)}
                      >
                        <IconEye size={13} />
                      </button>
                      <button
                        className="btn-icon tooltip"
                        data-tip="Editar"
                        onClick={() => handleEdit(c)}
                      >
                        <IconPencil size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Client Detail Drawer ── */}
      {selected && !editing && (
        <ClientDrawer
          client={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
        />
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
