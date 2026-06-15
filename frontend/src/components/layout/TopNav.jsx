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

// ── Menú principal (etiquetas tipo SmartOLT, mapeadas a rutas reales) ──
const MAIN = (t) => [
  { to: '/dashboard',  label: t('nav.dashboard'),    Icon: IconLayoutDashboard },
  { to: '/onu/unconfigured', label: t('nav.unconfigured'), Icon: IconPlugConnected },
  { to: '/onts',       label: t('nav.configured'),   Icon: IconCircleCheck },
  { to: '/graphs',     label: t('nav.graphs'),       Icon: IconChartLine },
  { to: '/diagnostics', label: t('nav.diagnostics'), Icon: IconStethoscope },
  { to: '/events',     label: t('nav.tasks'),        Icon: IconListCheck },
];

const REPORTS = (t) => [
  { to: '/reports/tasks',          label: t('nav.reportsTasks') },
  { to: '/reports/authorizations', label: t('nav.reportsAuthorizations') },
  { to: '/reports/export',         label: t('nav.reportsExport') },
  { to: '/reports/import',         label: t('nav.reportsImport') },
];

const SETTINGS = (t) => [
  { to: '/zones',           label: t('nav.zones') },
  { to: '/odbs',            label: t('nav.odbs') },
  { to: '/onu-types',       label: t('nav.onuTypes') },
  { to: '/speed-profiles',  label: t('nav.speedProfiles') },
  { to: '/olts',            label: t('nav.olts') },
  { to: '/tr069',           label: t('nav.vpnTr069') },
  { to: '/auth-presets',    label: t('nav.authPresets') },
  { to: '/settings',        label: t('nav.general') },
  { to: '/users',           label: t('nav.users') },
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
  const mainItems = MAIN(t);
  const reportsItems = REPORTS(t);
  const settingsItems = SETTINGS(t);

  return (
    <>
      <header className="sol-topnav">
        <div className="sol-brand"><span className="logo">◉</span> {t('nav.brand')} <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 6, verticalAlign: 'middle' }}>{t('nav.version')}</span></div>

        <nav className="sol-nav">
          {mainItems.map(({ to, label, Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to);
            return (
              <NavLink key={label} to={to} className={`sol-nav-item${active ? ' active' : ''}`}>
                <Icon size={15} /> {label}
              </NavLink>
            );
          })}
          <Dropdown label={t('nav.reports')} items={reportsItems} navigate={navigate} />
          <NavLink to="/config-comparison" className={`sol-nav-item${location.pathname === '/config-comparison' ? ' active' : ''}`}>
            <IconGitCompare size={15} /> {t('nav.configMismatches')}
          </NavLink>
          <button className="sol-nav-item save" onClick={() => setSaveOpen(true)}>
            <IconDeviceFloppy size={15} /> {t('nav.saveConfig')}
          </button>
          <Dropdown label={t('nav.settings')} items={settingsItems} navigate={navigate} />
        </nav>

        <div className="sol-right">
          <button className="sol-iconbtn" title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')} onClick={toggle}>
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <button className="sol-iconbtn" title={t('nav.language')}><IconWorld size={17} /></button>
          <button className="sol-iconbtn" title={user?.email || 'User'} onClick={() => navigate('/users')}>
            <IconUser size={17} />
          </button>
          <button className="sol-logout" onClick={handleLogout}><IconPower size={15} /> {t('nav.logOut')}</button>
        </div>
      </header>

      <SaveConfigGlobalModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </>
  );
}
