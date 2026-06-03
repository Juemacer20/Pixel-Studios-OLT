import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IconDashboard, IconRouter, IconAntenna, IconBell, IconUsers,
  IconMap, IconSettings, IconChevronLeft, IconChevronRight,
  IconWifi, IconActivity, IconFileReport, IconNetworkOff,
  IconGauge, IconDatabase, IconCode, IconLogout, IconPower,
  IconShieldLock, IconChartBar,
} from '@tabler/icons-react';
import { useUIStore } from '../../store/uiStore';
import { useAlertStore } from '../../store/alertStore';
import { useONTStore } from '../../store/ontStore';
import { useAuthStore } from '../../store/authStore';

const NAV = [
  {
    label: 'MONITOREO',
    items: [
      { to: '/dashboard',     icon: IconDashboard,  label: 'Dashboard' },
      { to: '/olts',          icon: IconRouter,     label: 'OLTs' },
      { to: '/onts',          icon: IconAntenna,    label: 'ONTs' },
      { to: '/pon-ports',     icon: IconNetworkOff, label: 'Puertos PON' },
      { to: '/signal',        icon: IconGauge,      label: 'Señal' },
      { to: '/map',           icon: IconMap,        label: 'Mapa GPS' },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { to: '/clients',       icon: IconUsers,      label: 'Clientes' },
      { to: '/ztp',           icon: IconWifi,       label: 'ZTP',       badge: 'ztp' },
      { to: '/speed-profiles',icon: IconActivity,   label: 'Velocidades' },
      { to: '/tr069',         icon: IconDatabase,   label: 'TR-069' },
    ],
  },
  {
    label: 'REPORTES',
    items: [
      { to: '/events',        icon: IconBell,       label: 'Eventos',   badge: 'alerts' },
      { to: '/alerts',        icon: IconShieldLock, label: 'Alertas' },
      { to: '/reports',       icon: IconFileReport, label: 'Reportes' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { to: '/users',         icon: IconShieldLock, label: 'Usuarios' },
      { to: '/settings',      icon: IconSettings,   label: 'Configuración' },
    ],
  },
];

export default function Sidebar() {
  const collapsed  = useUIStore(s => s.sidebarCollapsed);
  const toggle     = useUIStore(s => s.toggleSidebar);
  const alertCount = useAlertStore(s => s.alertCount);
  const pendingZTP = useONTStore(s => s.pendingZTP.length);
  const { user, clearAuth } = useAuthStore();
  const location   = useLocation();
  const navigate   = useNavigate();

  const getBadge = (key) => {
    if (key === 'alerts' && alertCount > 0) return alertCount;
    if (key === 'ztp'    && pendingZTP > 0) return pendingZTP;
    return null;
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col"
      style={{
        width: collapsed ? '52px' : '220px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.25s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: '1px solid var(--border)', minHeight: '48px' }}
      >
        <div
          className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-bold font-mono"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          PS
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Pixel Studios
            </div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              OLT Manager v2
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {NAV.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-3 py-1 text-[9px] font-semibold tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.label}
              </div>
            )}
            {collapsed && <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--border)' }} />}
            {section.items.map(({ to, icon: Icon, label, badge }) => {
              const badgeVal = badge ? getBadge(badge) : null;
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <div key={to} className="relative group px-1">
                  <NavLink
                    to={to}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-100"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(31,111,235,0.12)' : 'transparent',
                      fontSize: '13px',
                    }}
                  >
                    <Icon size={15} className="flex-shrink-0" style={{ color: isActive ? 'var(--accent-hover)' : undefined }} />
                    {!collapsed && (
                      <span className="flex-1 whitespace-nowrap">{label}</span>
                    )}
                    {!collapsed && badgeVal && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                        style={{ background: 'var(--red)', color: '#fff', minWidth: '18px', textAlign: 'center' }}
                      >
                        {badgeVal > 99 ? '99+' : badgeVal}
                      </span>
                    )}
                  </NavLink>
                  {collapsed && (
                    <div
                      className="absolute left-12 top-0 pointer-events-none opacity-0 group-hover:opacity-100 z-50"
                      style={{
                        background: '#2d333b',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                        transition: 'opacity 0.15s',
                        marginTop: '2px',
                      }}
                    >
                      {label}
                      {badgeVal && (
                        <span className="ml-2 px-1 rounded text-[10px]" style={{ background: 'var(--red)', color: '#fff' }}>
                          {badgeVal}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md" style={{ background: 'var(--bg-hover)' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {(user.name || user.email || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name || user.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user.role || 'admin'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 p-1 rounded"
              style={{ color: 'var(--text-muted)' }}
              title="Cerrar sesión"
            >
              <IconLogout size={13} />
            </button>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
