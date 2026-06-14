import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPlugConnected, IconCircleCheck, IconChartLine,
  IconStethoscope, IconListCheck, IconChevronDown, IconDeviceFloppy,
  IconWorld, IconUser, IconPower, IconGitCompare, IconSun, IconMoon,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { oltAPI } from '../../services/api';
import toast from 'react-hot-toast';

function SaveConfigGlobalModal({ open, onClose }) {
  const [busy, setBusy] = useState(false);
  const handleSave = async () => {
    setBusy(true);
    try { await oltAPI.saveConfig(); toast.success('Configuration saved to OLT'); onClose(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal show onu-ui-modal" style={{ display: 'block' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button className="close" onClick={onClose}>&times;</button>
              <h3>Save configuration</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                This will save the running configuration to the startup configuration on the OLT.
                All changes will be persisted across reboots.
              </p>
            </div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>No, cancel</a>
              <a href="#" className="btn btn-primary" onClick={handleSave}>{busy ? 'Saving…' : 'Yes, save configuration'}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Menú principal (etiquetas tipo SmartOLT, mapeadas a rutas reales) ──
const MAIN = [
  { to: '/dashboard',  label: 'Dashboard',    Icon: IconLayoutDashboard },
  { to: '/onu/unconfigured', label: 'Unconfigured', Icon: IconPlugConnected },
  { to: '/onts',       label: 'Configured',   Icon: IconCircleCheck },
  { to: '/graphs',     label: 'Graphs',       Icon: IconChartLine },
  { to: '/diagnostics', label: 'Diagnostics', Icon: IconStethoscope },
  { to: '/events',     label: 'Tasks',        Icon: IconListCheck },
];

const REPORTS = [
  { to: '/reports/tasks',          label: 'Tasks' },
  { to: '/reports/authorizations', label: 'Authorizations' },
  { to: '/reports/export',         label: 'Export' },
  { to: '/reports/import',         label: 'Import' },
];

const SETTINGS = [
  { to: '/zones',           label: 'Zones' },
  { to: '/odbs',            label: 'ODBs' },
  { to: '/onu-types',       label: 'ONU types' },
  { to: '/speed-profiles',  label: 'Speed profiles' },
  { to: '/olts',            label: 'OLTs' },
  { to: '/tr069',           label: 'VPN & TR069' },
  { to: '/auth-presets',    label: 'Authorization presets' },
  { to: '/settings',        label: 'General' },
  { to: '/users',           label: 'Users' },
];

function Dropdown({ label, items, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="sol-dd" ref={ref}>
      <button className="sol-nav-item" onClick={() => setOpen(o => !o)}>
        {label} <IconChevronDown size={12} className="caret" />
      </button>
      {open && (
        <div className="sol-dd-menu">
          {items.map((it, i) => (
            <a key={i} onClick={() => { setOpen(false); navigate(it.to); }}>{it.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [saveOpen, setSaveOpen] = useState(false);

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <>
      <header className="sol-topnav">
        <div className="sol-brand"><span className="logo">◉</span> Pixel Studios OLT <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 6, verticalAlign: 'middle' }}>v3.3.0</span></div>

        <nav className="sol-nav">
          {MAIN.map(({ to, label, Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to);
            return (
              <NavLink key={label} to={to} className={`sol-nav-item${active ? ' active' : ''}`}>
                <Icon size={15} /> {label}
              </NavLink>
            );
          })}
          <Dropdown label="Reports" items={REPORTS} navigate={navigate} />
          <NavLink to="/config-comparison" className={`sol-nav-item${location.pathname === '/config-comparison' ? ' active' : ''}`}>
            <IconGitCompare size={15} /> Config mismatches
          </NavLink>
          <button className="sol-nav-item save" onClick={() => setSaveOpen(true)}>
            <IconDeviceFloppy size={15} /> Save config
          </button>
          <Dropdown label="Settings" items={SETTINGS} navigate={navigate} />
        </nav>

        <div className="sol-right">
          <button className="sol-iconbtn" title={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle}>
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <button className="sol-iconbtn" title="Language"><IconWorld size={17} /></button>
          <button className="sol-iconbtn" title={user?.email || 'User'} onClick={() => navigate('/users')}>
            <IconUser size={17} />
          </button>
          <button className="sol-logout" onClick={handleLogout}><IconPower size={15} /> Log out</button>
        </div>
      </header>

      <SaveConfigGlobalModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </>
  );
}
