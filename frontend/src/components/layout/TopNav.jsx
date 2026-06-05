import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPlugConnected, IconCircleCheck, IconChartLine,
  IconStethoscope, IconListCheck, IconChevronDown, IconDeviceFloppy,
  IconWorld, IconUser, IconPower,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';

// ── Menú principal (etiquetas tipo SmartOLT, mapeadas a rutas reales) ──
const MAIN = [
  { to: '/dashboard',  label: 'Dashboard',    Icon: IconLayoutDashboard },
  { to: '/onu/unconfigured', label: 'Unconfigured', Icon: IconPlugConnected },
  { to: '/onts',       label: 'Configured',   Icon: IconCircleCheck },
  { to: '/graphs',     label: 'Graphs',       Icon: IconChartLine },
  { to: '/pon-ports',  label: 'Diagnostics',  Icon: IconStethoscope },
  { to: '/events',     label: 'Tasks',        Icon: IconListCheck },
];

const REPORTS = [
  { to: '/reports', label: 'Authorizations' },
  { to: '/reports', label: 'Export' },
  { to: '/reports', label: 'Import' },
  { to: '/olts',    label: 'Find config mismatches (DB vs OLT)' },
  { to: '/alerts',  label: 'Alerts' },
  { to: '/map',     label: 'Map' },
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

  const handleLogout = () => { clearAuth(); navigate('/login'); };
  const handleSave = () => {
    // Equivalente al "Save configuration" de SmartOLT (guardar NVRAM)
    window.dispatchEvent(new CustomEvent('sol-save-config'));
  };

  return (
      <header className="sol-topnav">
        <div className="sol-brand"><span className="logo">◉</span> Pixel Studios OLT</div>

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
          <button className="sol-nav-item save" onClick={handleSave}>
            <IconDeviceFloppy size={15} /> Save config
          </button>
          <Dropdown label="Settings" items={SETTINGS} navigate={navigate} />
        </nav>

        <div className="sol-right">
          <button className="sol-iconbtn" title="Language"><IconWorld size={17} /></button>
          <button className="sol-iconbtn" title={user?.email || 'User'} onClick={() => navigate('/users')}>
            <IconUser size={17} />
          </button>
          <button className="sol-logout" onClick={handleLogout}><IconPower size={15} /> Log out</button>
        </div>
      </header>
  );
}
