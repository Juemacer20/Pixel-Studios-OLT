import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconRefresh, IconX, IconCheck, IconChevronDown, IconChevronUp,
  IconPlugConnected, IconWifi,
} from '@tabler/icons-react';
import { ontAPI, oltAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import SignalValue from '../../components/shared/SignalValue';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Authorize Modal ─────────────────────────────────────────────────────── */
function AuthorizeModal({ ont, onClose, onSuccess }) {
  const [name, setName]   = useState('');
  const [notes, setNotes] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const authMut = useMutation({
    mutationFn: () => ontAPI.patch(ont.id, { description: name.trim() }),
    onSuccess: () => {
      toast.success(`ONT ${ont.serial_number} authorized as "${name.trim()}"`);
      onSuccess(ont.id);
      onClose();
    },
    onError: () => toast.error('Failed to authorize ONT'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    authMut.mutate();
  };

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 400, backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 401, width: 460, maxWidth: '95vw',
        background: 'var(--panel-bg)', border: '1px solid var(--border)',
        borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPlugConnected size={16} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Authorize ONT
            </span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Readonly info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OLT</div>
              <div style={{
                padding: '7px 10px', background: 'var(--content-bg)',
                border: '1px solid var(--border)', borderRadius: 5,
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                {ont.olt?.name || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interface</div>
              <div style={{
                padding: '7px 10px', background: 'var(--content-bg)',
                border: '1px solid var(--border)', borderRadius: 5,
                fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ont.description || '—'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Serial Number</div>
            <div style={{
              padding: '7px 10px', background: 'var(--content-bg)',
              border: '1px solid var(--border)', borderRadius: 5,
              fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace',
            }}>
              {ont.serial_number}
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Client Name <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              ref={nameRef}
              className="input-base"
              placeholder="e.g. Juan Garcia"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Notes <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              className="input-base"
              style={{ resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
              placeholder="Installation notes, address, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={!name.trim() || authMut.isPending}
              style={{
                background: 'rgba(31,184,184,0.15)',
                borderColor: 'var(--cyan)',
                color: 'var(--cyan)',
              }}
            >
              <IconCheck size={13} />
              {authMut.isPending ? 'Authorizing…' : 'Authorize'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── OLT Card ────────────────────────────────────────────────────────────── */
function OLTCard({ group, onAuthorize }) {
  const [collapsed, setCollapsed] = useState(false);
  const { olt, onts } = group;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconWifi size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {olt?.name || `OLT #${olt?.id}`}
          </span>
          <span style={{
            padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: 'rgba(255,165,0,0.12)', color: 'var(--orange)',
            border: '1px solid rgba(255,165,0,0.25)',
          }}>
            {onts.length} unconfigured
          </span>
        </div>
        <button className="btn-icon" style={{ padding: 4 }}>
          {collapsed ? <IconChevronDown size={13} /> : <IconChevronUp size={13} />}
        </button>
      </div>

      {/* Table */}
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-base">
            <thead>
              <tr>
                <th>Interface</th>
                <th>SN</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Rx Power</th>
                <th>Last Seen</th>
                <th style={{ textAlign: 'center', width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {onts.map(ont => (
                <tr key={ont.id}>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {ont.description || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                      {ont.serial_number}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={ont.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <SignalValue value={ont.rx_power} size="sm" />
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatRelative(ont.last_seen)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn"
                      style={{
                        padding: '3px 12px', fontSize: 11,
                        background: 'rgba(31,184,184,0.12)',
                        borderColor: 'var(--cyan)',
                        color: 'var(--cyan)',
                      }}
                      onClick={() => onAuthorize(ont)}
                    >
                      Authorize
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── OLT multi-select filter ─────────────────────────────────────────────── */
function OLTFilter({ olts, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const label = selected.length === 0
    ? 'All OLTs'
    : selected.length === 1
      ? olts.find(o => String(o.id) === selected[0])?.name || 'OLT'
      : `${selected.length} OLTs`;

  const toggle = (id) => {
    const sid = String(id);
    onChange(selected.includes(sid)
      ? selected.filter(x => x !== sid)
      : [...selected, sid]
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>{label}</span>
        <IconChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'var(--panel-bg)', border: '1px solid var(--border)',
          borderRadius: 6, zIndex: 100, minWidth: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          padding: '4px 0',
        }}>
          <div
            style={{ padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}
            onClick={() => { onChange([]); setOpen(false); }}
          >
            All OLTs
          </div>
          {olts.map(o => {
            const sid = String(o.id);
            const checked = selected.includes(sid);
            return (
              <div
                key={o.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', cursor: 'pointer', fontSize: 12,
                  color: checked ? 'var(--cyan)' : 'var(--text-secondary)',
                  background: checked ? 'rgba(31,184,184,0.08)' : 'transparent',
                }}
                onClick={() => toggle(o.id)}
              >
                <input type="checkbox" className="checkbox" readOnly checked={checked} style={{ pointerEvents: 'none' }} />
                {o.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Unconfigured() {
  const queryClient = useQueryClient();
  const [selectedOLTs, setSelectedOLTs] = useState([]);
  const [modalONT, setModalONT]         = useState(null);

  /* ── Queries ── */
  const { data: resp, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['onts-unconfigured'],
    queryFn: () =>
      ontAPI.unconfigured()
        .then(r => r.data?.data || { groups: [], total: 0 }),
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: oltsResp } = useQuery({
    queryKey: ['olts-list'],
    queryFn: () =>
      oltAPI.list().then(r => r.data?.data || r.data?.results || r.data || []).catch(() => []),
    retry: 1,
  });

  const allGroups = resp?.groups || [];
  const total     = resp?.total  || 0;
  const olts      = Array.isArray(oltsResp) ? oltsResp : [];

  /* ── Filter by selected OLTs ── */
  const visibleGroups = useMemo(() => {
    if (selectedOLTs.length === 0) return allGroups;
    return allGroups.filter(g => selectedOLTs.includes(String(g.olt?.id)));
  }, [allGroups, selectedOLTs]);

  /* ── On successful authorize: remove that ONT from cache ── */
  const handleAuthorizeSuccess = useCallback((ontId) => {
    queryClient.setQueryData(['onts-unconfigured'], (old) => {
      if (!old) return old;
      const groups = (old.data?.groups || old.groups || [])
        .map(g => ({ ...g, onts: g.onts.filter(o => o.id !== ontId) }))
        .filter(g => g.onts.length > 0);
      const total = groups.reduce((acc, g) => acc + g.onts.length, 0);
      if (old.data) return { ...old, data: { groups, total } };
      return { groups, total };
    });
  }, [queryClient]);

  /* ── Build OLT list for filter from groups if API list is empty ── */
  const filterOLTs = useMemo(() => {
    if (olts.length > 0) return olts;
    return allGroups.map(g => g.olt).filter(Boolean);
  }, [olts, allGroups]);

  const visibleTotal = visibleGroups.reduce((acc, g) => acc + g.onts.length, 0);

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="page-title">Unconfigured ONUs</span>
          <span style={{
            padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: total > 0 ? 'rgba(255,165,0,0.12)' : 'rgba(100,100,100,0.12)',
            color: total > 0 ? 'var(--orange)' : 'var(--text-muted)',
            border: `1px solid ${total > 0 ? 'rgba(255,165,0,0.25)' : 'var(--border)'}`,
          }}>
            {total} unconfigured
          </span>
          {isFetching && !isLoading && <span className="polling-dot" title="Updating…" />}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <OLTFilter olts={filterOLTs} selected={selectedOLTs} onChange={setSelectedOLTs} />
          <button className="btn" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh size={13} style={{ animation: isFetching ? 'spin-slow 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 24, height: 24, margin: '0 auto 10px', display: 'block' }} />
          Scanning for unconfigured ONUs…
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="empty-state">
          <IconPlugConnected size={36} style={{ margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No unconfigured ONUs found</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            All ONUs are already configured, or none have been discovered yet.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleGroups.map(group => (
            <OLTCard
              key={group.olt?.id}
              group={group}
              onAuthorize={setModalONT}
            />
          ))}
        </div>
      )}

      {/* Bottom stat */}
      {!isLoading && visibleGroups.length > 0 && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--content-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 12, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{visibleTotal}</span>
          {' '}total unconfigured across{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{visibleGroups.length}</span>
          {' '}OLT{visibleGroups.length !== 1 ? 's' : ''}
          {selectedOLTs.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}> (filtered)</span>
          )}
        </div>
      )}

      {/* Authorize Modal */}
      {modalONT && (
        <AuthorizeModal
          ont={modalONT}
          onClose={() => setModalONT(null)}
          onSuccess={handleAuthorizeSuccess}
        />
      )}
    </div>
  );
}
