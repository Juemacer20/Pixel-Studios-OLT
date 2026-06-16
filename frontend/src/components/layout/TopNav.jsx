import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPlugConnected, IconCircleCheck, IconChartLine,
  IconStethoscope, IconListCheck, IconChevronDown, IconDeviceFloppy,
  IconWorld, IconUser, IconPower, IconGitCompare, IconSun, IconMoon,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { oltAPI } from '../../services/api';
import toast from 'react-hot-toast';

function SaveConfigGlobalModal({ open, onClose }) {
  const { t } = useTranslation();
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
              <h3>{t('nav.saveConfigTitle')}</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                {t('nav.saveConfigBody')}
              </p>
            </div>
            <div className="modal-footer">
              <a href="#" className="btn btn-link" onClick={onClose}>{t('nav.cancel')}</a>
              <a href="#" className="btn btn-primary" onClick={handleSave}>{busy ? t('nav.saving') : t('nav.saveConfigConfirm')}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Menú principal (orden SmartOLT) ──
const MAIN = [
  { to: '/onu/unconfigured', label: 'Unconfigured', Icon: IconPlugConnected },
  { to: '/onu/configured',   label: 'Configured',   Icon: IconCircleCheck },
  { to: '/graphs',           label: 'Graphs',       Icon: IconChartLine },
  { to: '/diagnostics',      label: 'Diagnostics',  Icon: IconStethoscope },
];

const REPORTS = [
  { to: '/reports/tasks',               label: 'Tasks' },
  { to: '/reports/authorizations/list', label: 'Authorizations' },
  { to: '/reports/export',              label: 'Export' },
  { to: '/reports/import',              label: 'Import' },
];

const LOCATIONS = [
  { to: '/locations/listing', label: 'Zones' },
  { to: '/odbs/listing',      label: 'ODBs' },
];

const ADMIN = [
  { to: '/onu_types/listing',                  label: 'ONU types' },
  { to: '/speed_profiles',                     label: 'Speed profiles' },
  { to: '/olt',                                label: 'OLTs' },
  { to: '/system_config',                      label: 'VPN & TR069' },
  { to: '/onu_authorization_presets/listing',  label: 'Auth presets' },
  { to: '/settings',                           label: 'Settings' },
  { to: '/users',                              label: 'Users' },
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
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [saveOpen, setSaveOpen] = useState(false);

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <>
      <header className="sol-topnav">
        <div className="sol-brand"><span className="logo">◉</span> SMARTOLT <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 6, verticalAlign: 'middle' }}>v3.3.0</span></div>

        <nav className="sol-nav">
          {MAIN.map(({ to, label, Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <NavLink key={to} to={to} className={`sol-nav-item${active ? ' active' : ''}`}>
                <Icon size={15} /> {label}
              </NavLink>
            );
          })}
          <Dropdown label="Reports"   items={REPORTS}   navigate={navigate} />
          <NavLink
            to="/config_comparison"
            className={`sol-nav-item${location.pathname === '/config_comparison' ? ' active' : ''}`}
          >
            <IconGitCompare size={15} /> Config mismatches
          </NavLink>
          <Dropdown label="Locations" items={LOCATIONS} navigate={navigate} />
          <Dropdown label="Admin"     items={ADMIN}     navigate={navigate} />
          <button className="sol-nav-item save" onClick={() => setSaveOpen(true)}>
            <IconDeviceFloppy size={15} /> Save config
          </button>
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
