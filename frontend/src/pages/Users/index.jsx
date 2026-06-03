import React, { useState } from 'react';
import {
  IconPlus, IconPencil, IconTrash, IconX, IconCheck,
  IconUsers, IconShieldCheck, IconEye, IconUser,
  IconLock,
} from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: 1, name: 'Admin',        email: 'admin@pixel-studios.com', role: 'admin',    last_login: new Date().toISOString(),                    active: true },
  { id: 2, name: 'NOC Técnico',  email: 'noc@pixel-studios.com',   role: 'noc',      last_login: new Date(Date.now() - 86400000).toISOString(), active: true },
  { id: 3, name: 'Solo Lectura', email: 'view@pixel-studios.com',  role: 'readonly', last_login: new Date(Date.now() - 604800000).toISOString(),active: false },
];

const ROLES = [
  { value: 'admin',    label: 'Administrador', badge: 'badge-red',    icon: <IconShieldCheck size={11} /> },
  { value: 'noc',      label: 'NOC',           badge: 'badge-orange', icon: <IconUser size={11} /> },
  { value: 'readonly', label: 'Solo Lectura',  badge: 'badge-gray',   icon: <IconEye size={11} /> },
];

function roleMeta(role) {
  return ROLES.find(r => r.value === role) || ROLES[2];
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {initials}
    </div>
  );
}

// ── User Modal ────────────────────────────────────────────────────────────────
function UserModal({ user, onSave, onClose }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    password: '',
    role:     user?.role     || 'noc',
    active:   user?.active   ?? true,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = 'Requerido';
    if (!form.email.trim()) errs.email = 'Requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido';
    if (!isEdit && !form.password) errs.password = 'Requerido';
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...user, ...form, id: user?.id });
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="card"
          style={{ width: 440, maxWidth: '90vw', animation: 'fade-in 0.15s ease' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {isEdit ? `Editar: ${user.name}` : 'Nuevo Usuario'}
            </span>
            <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nombre</label>
              <input
                className="input-base"
                placeholder="Nombre completo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={errors.name ? { borderColor: 'var(--red)' } : {}}
              />
              {errors.name && <span style={{ fontSize: 10, color: 'var(--red)' }}>{errors.name}</span>}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
              <input
                className="input-base"
                type="email"
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={errors.email ? { borderColor: 'var(--red)' } : {}}
              />
              {errors.email && <span style={{ fontSize: 10, color: 'var(--red)' }}>{errors.email}</span>}
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Contraseña {isEdit && <span style={{ color: 'var(--text-muted)' }}>(dejar vacío para no cambiar)</span>}
              </label>
              <input
                className="input-base"
                type="password"
                placeholder={isEdit ? '••••••••' : 'Contraseña'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={errors.password ? { borderColor: 'var(--red)' } : {}}
              />
              {errors.password && <span style={{ fontSize: 10, color: 'var(--red)' }}>{errors.password}</span>}
            </div>

            {/* Role */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Rol</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${form.role === r.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.role === r.value ? 'rgba(31,111,235,0.1)' : 'var(--content-bg)',
                      color: form.role === r.value ? 'var(--cyan)' : 'var(--text-secondary)',
                      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                className="checkbox"
                id="active-chk"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              />
              <label htmlFor="active-chk" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Usuario activo
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <IconCheck size={13} /> {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose }) {
  return (
    <div className="drawer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        style={{ width: 380, animation: 'fade-in 0.15s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>Eliminar usuario</span>
          <button className="btn-icon" onClick={onClose}><IconX size={14} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          ¿Eliminar a <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <IconTrash size={13} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]       = useState(INITIAL_USERS);
  const [modal, setModal]       = useState(null); // null | { type: 'create'|'edit', user }
  const [delUser, setDelUser]   = useState(null);

  const handleSave = (formUser) => {
    if (formUser.id) {
      setUsers(prev => prev.map(u => u.id === formUser.id ? { ...u, ...formUser } : u));
    } else {
      setUsers(prev => [...prev, { ...formUser, id: Date.now(), last_login: null }]);
    }
    setModal(null);
  };

  const handleDelete = () => {
    setUsers(prev => prev.filter(u => u.id !== delUser.id));
    setDelUser(null);
  };

  const toggleActive = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  // Stats
  const total    = users.length;
  const admins   = users.filter(u => u.role === 'admin').length;
  const noc      = users.filter(u => u.role === 'noc').length;
  const readonly = users.filter(u => u.role === 'readonly').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconUsers size={18} style={{ color: 'var(--accent)' }} />
          Usuarios
        </h1>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'create', user: null })}>
          <IconPlus size={13} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total',       value: total,    color: 'var(--text-primary)', icon: <IconUsers size={14} /> },
          { label: 'Admins',      value: admins,   color: 'var(--red)',          icon: <IconShieldCheck size={14} /> },
          { label: 'NOC',         value: noc,      color: 'var(--orange)',       icon: <IconUser size={14} /> },
          { label: 'Solo Lectura',value: readonly,  color: 'var(--text-muted)',   icon: <IconEye size={14} /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6, color: s.color }}>
              {s.icon}
              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Último acceso</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Sin usuarios
                </td>
              </tr>
            ) : users.map(user => {
              const meta = roleMeta(user.role);
              return (
                <tr key={user.id} style={{ opacity: user.active ? 1 : 0.55 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={user.name} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td>
                    <span className={`badge ${meta.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmtDate(user.last_login)}
                  </td>
                  <td>
                    <div
                      onClick={() => toggleActive(user.id)}
                      style={{
                        width: 34, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer',
                        background: user.active ? 'var(--green)' : 'var(--border-light)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2, left: user.active ? 16 : 2,
                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => setModal({ type: 'edit', user })}
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Eliminar"
                        onClick={() => setDelUser(user)}
                        style={{ color: 'var(--red)' }}
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal && (
        <UserModal
          user={modal.user}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {delUser && (
        <DeleteModal
          user={delUser}
          onConfirm={handleDelete}
          onClose={() => setDelUser(null)}
        />
      )}
    </div>
  );
}
