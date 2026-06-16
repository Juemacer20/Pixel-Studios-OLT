# Fase 0: Component Library SmartOLT-like — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la biblioteca de componentes primitivos que todas las páginas del clon SmartOLT consumen, y alinear rutas y navegación con SmartOLT.

**Architecture:** Sin test framework instalado; la verificación es visual (dev server en :5173). Cada componente nuevo vive en `frontend/src/components/shared/`. El `SaveConfigContext` wrappea `AppLayout` para que cualquier página abra el modal global. Los componentes deprecados se marcan pero no se borran hasta Fase 8.

**Tech Stack:** React 18 · Vite · Tailwind CSS v3 · `@tabler/icons-react` · CSS vars de `index.css` (`.btn`, `.btn-primary`, `.btn-danger`, `.btn-success`, `.badge-*`, `.table-base`, `.input-base`)

---

## Archivo de referencia: estructura de rutas SmartOLT

Antes de empezar, tener claro el mapa de renombrado:

| Ruta actual | Nueva ruta SmartOLT |
|---|---|
| `/onts/*` | `/onu/configured` |
| `/onts/view/:id` | `/onu/view/:id` |
| `/onu-types` | `/onu_types/listing` |
| `/zones` | `/locations/listing` |
| `/odbs` | `/odbs/listing` |
| `/auth-presets` | `/onu_authorization_presets/listing` |
| `/config-comparison` | `/config_comparison` |
| `/speed-profiles` | `/speed_profiles` |
| `/tr069` | `/system_config` |
| `/olts` | `/olt` |
| `/olts/new` | `/olt/add` |
| `/olts/:id/config` | `/olt/edit/:id` |
| `/reports/authorizations` | `/reports/authorizations/list` |

---

## Task 1: Rutas SmartOLT en App.jsx + TopNav.jsx

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/layout/TopNav.jsx`

- [ ] **Step 1: Actualizar rutas en App.jsx**

Reemplazar las rutas en `AppLayout` para que coincidan con SmartOLT. Los paths de VSOL y KingType no cambian.

Agregar al inicio de `App.jsx`, justo después de los imports de páginas, dos helpers de redirect para rutas con parámetros dinámicos:

```jsx
import { useParams } from 'react-router-dom';

function RedirectOltView() {
  const { id } = useParams();
  return <Navigate to={`/onu/view/${id}`} replace />;
}
function RedirectOltConfig() {
  const { id } = useParams();
  return <Navigate to={`/olt/edit/${id}`} replace />;
}
```

Luego reemplazar el bloque `<Routes>` de `AppLayout` con:

```jsx
<Routes>
  <Route path="/"                          element={<Navigate to="/dashboard" replace />} />
  <Route path="/dashboard"                 element={<Dashboard />} />

  {/* OLTs */}
  <Route path="/olt"                       element={<OLTs />} />
  <Route path="/olt/add"                   element={<OLTNew />} />
  <Route path="/olt/edit/:id"              element={<OLTConfig />} />

  {/* ONTs / ONUs */}
  <Route path="/onu/configured"            element={<ONTs />} />
  <Route path="/onu/view/:id"              element={<ONUView />} />
  <Route path="/onu/unconfigured"          element={<Unconfigured />} />
  <Route path="/onu/authorize"             element={<AuthorizeONU />} />

  {/* Redirects de rutas viejas → nuevas (compatibilidad mientras se migran NavLinks) */}
  <Route path="/onts/view/:id"             element={<RedirectOltView />} />
  <Route path="/onts/*"                    element={<Navigate to="/onu/configured" replace />} />
  <Route path="/onu-types"                 element={<Navigate to="/onu_types/listing" replace />} />
  <Route path="/zones"                     element={<Navigate to="/locations/listing" replace />} />
  <Route path="/odbs"                      element={<Navigate to="/odbs/listing" replace />} />
  <Route path="/auth-presets"              element={<Navigate to="/onu_authorization_presets/listing" replace />} />
  <Route path="/config-comparison"         element={<Navigate to="/config_comparison" replace />} />
  <Route path="/speed-profiles"            element={<Navigate to="/speed_profiles" replace />} />
  <Route path="/tr069"                     element={<Navigate to="/system_config" replace />} />
  <Route path="/olts"                      element={<Navigate to="/olt" replace />} />
  <Route path="/olts/new"                  element={<Navigate to="/olt/add" replace />} />
  <Route path="/olts/:id/config"           element={<RedirectOltConfig />} />

  {/* Rutas SmartOLT */}
  <Route path="/onu_types/listing"         element={<OnuTypes />} />
  <Route path="/locations/listing"         element={<Zones />} />
  <Route path="/odbs/listing"              element={<ODBs />} />
  <Route path="/onu_authorization_presets/listing" element={<AuthPresets />} />
  <Route path="/config_comparison"         element={<ConfigComparison />} />
  <Route path="/speed_profiles"            element={<SpeedProfiles />} />
  <Route path="/system_config"             element={<TR069 />} />

  {/* Reports */}
  <Route path="/reports"                   element={<Navigate to="/reports/tasks" replace />} />
  <Route path="/reports/tasks"             element={<ReportsTasks />} />
  <Route path="/reports/authorizations/list" element={<ReportsAuths />} />
  <Route path="/reports/authorizations"    element={<Navigate to="/reports/authorizations/list" replace />} />
  <Route path="/reports/export"            element={<ReportsExport />} />
  <Route path="/reports/import"            element={<ReportsImport />} />

  {/* Otros */}
  <Route path="/graphs"                    element={<Graphs />} />
  <Route path="/diagnostics"               element={<Diagnostics />} />
  <Route path="/clients/*"                 element={<Clients />} />
  <Route path="/map"                       element={<MapView />} />
  <Route path="/alerts"                    element={<Alerts />} />
  <Route path="/events"                    element={<Events />} />
  <Route path="/settings"                  element={<Settings />} />
  <Route path="/users"                     element={<Users />} />

  {/* VSOL (no cambian) */}
  <Route path="/olts/:id/vsol"              element={<VSOLDashboard />} />
  <Route path="/olts/:id/vsol/pon/:ponIndex" element={<VSOLOnuList />} />
  <Route path="/olts/:id/vsol/onu/:ponIndex/:onuId" element={<VSOLOnuView />} />
  <Route path="/olts/:id/vsol/profiles"     element={<VSOLProfiles />} />
  <Route path="/olts/:id/vsol/autofind"     element={<VSOLAutofind />} />
  <Route path="/olts/:id/vsol/batch"        element={<VSOLBatch />} />

  {/* KingType (no cambian) */}
  <Route path="/olts/:id/kingtype"           element={<KingTypeDashboard />} />
  <Route path="/olts/:id/kingtype/pon/:ponIndex" element={<KingTypeOnuList />} />
  <Route path="/olts/:id/kingtype/profiles"  element={<KingTypeProfiles />} />
  <Route path="/olts/:id/kingtype/autofind"  element={<KingTypeAutofind />} />
  <Route path="/olts/:id/kingtype/batch"     element={<KingTypeBatch />} />
</Routes>
```

- [ ] **Step 2: Actualizar nav en TopNav.jsx**

Reemplazar los arrays `MAIN`, `REPORTS`, `SETTINGS` y agregar `LOCATIONS` y `ADMIN` separados para reflejar el orden de SmartOLT:

```jsx
// ── Menú principal (orden SmartOLT)
const MAIN = (t) => [
  { to: '/onu/unconfigured', label: 'Unconfigured', Icon: IconPlugConnected },
  { to: '/onu/configured',   label: 'Configured',   Icon: IconCircleCheck },
  { to: '/graphs',           label: 'Graphs',       Icon: IconChartLine },
  { to: '/diagnostics',      label: 'Diagnostics',  Icon: IconStethoscope },
];

const REPORTS = (t) => [
  { to: '/reports/tasks',                label: 'Tasks' },
  { to: '/reports/authorizations/list',  label: 'Authorizations' },
  { to: '/reports/export',               label: 'Export' },
  { to: '/reports/import',               label: 'Import' },
];

const LOCATIONS = (t) => [
  { to: '/locations/listing', label: 'Zones' },
  { to: '/odbs/listing',      label: 'ODBs' },
];

const ADMIN = (t) => [
  { to: '/onu_types/listing',                  label: 'ONU types' },
  { to: '/speed_profiles',                     label: 'Speed profiles' },
  { to: '/olt',                                label: 'OLTs' },
  { to: '/system_config',                      label: 'VPN & TR069' },
  { to: '/onu_authorization_presets/listing',  label: 'Auth presets' },
  { to: '/settings',                           label: 'Settings' },
  { to: '/users',                              label: 'Users' },
];
```

En el `return` del componente `TopNav`, reemplazar el bloque `<nav>` con:

```jsx
<nav className="sol-nav">
  {MAIN(t).map(({ to, label, Icon }) => {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <NavLink key={to} to={to} className={`sol-nav-item${active ? ' active' : ''}`}>
        <Icon size={15} /> {label}
      </NavLink>
    );
  })}
  <Dropdown label="Reports"   items={REPORTS(t)}   navigate={navigate} />
  <NavLink
    to="/config_comparison"
    className={`sol-nav-item${location.pathname === '/config_comparison' ? ' active' : ''}`}
  >
    <IconGitCompare size={15} /> Config mismatches
  </NavLink>
  <Dropdown label="Locations" items={LOCATIONS(t)} navigate={navigate} />
  <Dropdown label="Admin"     items={ADMIN(t)}     navigate={navigate} />
  <button className="sol-nav-item save" onClick={() => setSaveOpen(true)}>
    <IconDeviceFloppy size={15} /> Save config
  </button>
</nav>
```

- [ ] **Step 3: Levantar dev server y verificar**

```bash
cd /home/juan/Pixel-Studios-OLT
docker-compose -f docker-compose.dev.yml up -d
cd backend && npm run dev &
cd frontend && npm run dev
```

Abrir `http://localhost:5173`. Verificar:
- La nav muestra: Unconfigured, Configured, Graphs, Diagnostics, Reports▼, Config mismatches, Locations▼, Admin▼, Save config
- Hacer clic en "Configured" → navega a `/onu/configured`
- Hacer clic en "Locations" → muestra Zones y ODBs
- La URL `/onts/view/1` redirige a `/onu/configured` (no a `/onu/view/1` porque el redirect de `:id` dinámico no funciona con Navigate estático — está bien por ahora, se corrige en cada página en Fases 1–8)

- [ ] **Step 4: Commit**

```bash
cd /home/juan/Pixel-Studios-OLT
git add frontend/src/App.jsx frontend/src/components/layout/TopNav.jsx
git commit -m "feat(nav): rutas y navegación alineadas con SmartOLT"
```

---

## Task 2: SaveConfigContext — modal global vía contexto React

**Files:**
- Create: `frontend/src/context/SaveConfigContext.jsx`
- Modify: `frontend/src/App.jsx` (wrappear AppLayout con el Provider)
- Modify: `frontend/src/components/layout/TopNav.jsx` (usar contexto en lugar de estado local)

- [ ] **Step 1: Crear `SaveConfigContext.jsx`**

```jsx
// frontend/src/context/SaveConfigContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconX } from '@tabler/icons-react';
import { oltAPI } from '../services/api';
import toast from 'react-hot-toast';

const SaveConfigContext = createContext(null);

function SaveConfigModal({ open, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await oltAPI.saveConfig();
      toast.success('Configuration saved to OLT');
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save configuration');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 499, background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: 440, maxWidth: '92vw',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Save configuration
            </span>
            <button className="btn-icon" onClick={onClose} style={{ padding: 4 }}>
              <IconX size={14} />
            </button>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Do you want to save the current configuration to the OLT?
              This will apply all pending changes.
            </p>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 18px', borderTop: '1px solid var(--border)',
          }}>
            <button className="btn" onClick={onClose} disabled={busy}>
              No, cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                  Saving…
                </span>
              ) : 'Yes, save configuration'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function SaveConfigProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openSaveConfig = useCallback(() => setOpen(true), []);
  const closeSaveConfig = useCallback(() => setOpen(false), []);

  return (
    <SaveConfigContext.Provider value={{ openSaveConfig }}>
      {children}
      <SaveConfigModal open={open} onClose={closeSaveConfig} />
    </SaveConfigContext.Provider>
  );
}

export function useSaveConfig() {
  const ctx = useContext(SaveConfigContext);
  if (!ctx) throw new Error('useSaveConfig must be used inside SaveConfigProvider');
  return ctx;
}
```

- [ ] **Step 2: Wrappear AppLayout con `SaveConfigProvider` en App.jsx**

En `App.jsx`, importar el Provider y wrappear el contenido de `AppLayout`:

Agregar el import del Provider al inicio de `App.jsx`:

```jsx
import { SaveConfigProvider } from './context/SaveConfigContext';
```

Luego wrappear el JSX retornado por `AppLayout` con `<SaveConfigProvider>`. La estructura interna (TopNav, Routes, footer) no cambia — solo agregar el wrapper externo:

```jsx
function AppLayout() {
  useWebSocket();
  return (
    <SaveConfigProvider>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'transparent' }}>
        {/* mismo contenido del Task 1, sin cambios internos */}
        <TopNav />
        <UpdateBanner />
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto p-4">
            <div style={{ maxWidth: 1320, margin: '0 auto' }}>
              <Breadcrumbs />
              <React.Suspense fallback={<Fallback />}>
                <Routes>{/* mismas rutas del Task 1 */}</Routes>
              </React.Suspense>
            </div>
            <footer style={{ textAlign: 'center', padding: '14px', fontSize: 12, color: 'var(--text-muted)' }}>
              Pixel Studios OLT · v3.3.0 · © 2026
            </footer>
          </main>
        </div>
      </div>
    </SaveConfigProvider>
  );
}
```

- [ ] **Step 3: Actualizar TopNav para usar el contexto**

En `TopNav.jsx`, reemplazar el estado local `saveOpen` y `setSaveOpen` con el hook, y eliminar el componente `SaveConfigGlobalModal` inline (ya está en el Context):

```jsx
// Agregar import al inicio
import { useSaveConfig } from '../../context/SaveConfigContext';

// Dentro de TopNav():
// ELIMINAR: const [saveOpen, setSaveOpen] = useState(false);
// AGREGAR:
const { openSaveConfig } = useSaveConfig();

// En el botón Save config:
<button className="sol-nav-item save" onClick={openSaveConfig}>
  <IconDeviceFloppy size={15} /> Save config
</button>

// ELIMINAR al final del return:
// <SaveConfigGlobalModal open={saveOpen} onClose={() => setSaveOpen(false)} />
// ELIMINAR también la función SaveConfigGlobalModal completa del archivo
```

- [ ] **Step 4: Verificar en browser**

Recargar `http://localhost:5173`. Hacer clic en "Save config" en la nav. El modal debe aparecer con "No, cancel" y "Yes, save configuration". Hacer clic en "No, cancel" — el modal debe cerrarse.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/SaveConfigContext.jsx frontend/src/App.jsx frontend/src/components/layout/TopNav.jsx
git commit -m "feat(context): SaveConfigContext — modal global vía React context"
```

---

## Task 3: SmartButton — variantes de botón

**Files:**
- Create: `frontend/src/components/shared/SmartButton.jsx`

Los estilos de `.btn`, `.btn-primary`, `.btn-danger`, `.btn-success` ya existen en `index.css`. `SmartButton` solo aplica las clases correctas según `variant`.

- [ ] **Step 1: Crear `SmartButton.jsx`**

```jsx
// frontend/src/components/shared/SmartButton.jsx
import React from 'react';

const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  success: 'btn btn-success',
  warning: 'btn btn-warning',
  danger:  'btn btn-danger',
  default: 'btn',
  link:    'btn btn-link',
};

const SIZE_STYLE = {
  sm: { padding: '2px 8px', fontSize: 11 },
  md: {},
  lg: { padding: '7px 16px', fontSize: 14 },
};

export default function SmartButton({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  children,
}) {
  const cls = VARIANT_CLASS[variant] ?? 'btn';
  const sz  = SIZE_STYLE[size] ?? {};
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`${cls} ${className}`}
      style={{ ...sz, ...(isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}), ...style }}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="spinner" style={{ width: 12, height: 12 }} />
          {children}
        </span>
      ) : children}
    </button>
  );
}
```

También agregar `.btn-warning` y `.btn-link` a `index.css` si no existen. Buscar la sección "Buttons" en `index.css` y agregar después de `.btn-success:hover`:

```css
.btn-warning {
  background: var(--warning);
  border-color: var(--warning);
  color: #fff;
}
.btn-warning:hover { filter: brightness(0.93); }

.btn-link {
  background: transparent;
  border-color: transparent;
  color: var(--link);
  padding-left: 0;
  padding-right: 0;
}
.btn-link:hover { text-decoration: underline; background: transparent; }
```

- [ ] **Step 2: Verificar**

No hay página de prueba; se verifica cuando se use en siguientes Tasks. Asegurarse de que el archivo compila sin errores:

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/SmartButton.jsx frontend/src/index.css
git commit -m "feat(ui): SmartButton con variantes primary/success/warning/danger/default/link"
```

---

## Task 4: SmartModal — modal genérico header/body/footer

**Files:**
- Create: `frontend/src/components/shared/SmartModal.jsx`

`ActionModal.jsx` sigue existiendo (no se borra). `SmartModal` es el nuevo primitivo más simple para contenido arbitrario.

- [ ] **Step 1: Crear `SmartModal.jsx`**

```jsx
// frontend/src/components/shared/SmartModal.jsx
import React, { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

const SIZE_WIDTH = { sm: 380, md: 480, lg: 620, xl: 820 };

export default function SmartModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const width = SIZE_WIDTH[size] ?? SIZE_WIDTH.md;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 499, background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'fade-in 0.15s ease',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width, maxWidth: '94vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
            <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ padding: 4 }}>
              <IconX size={14} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {footer ?? (
              <button className="btn" onClick={onClose}>Close</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/SmartModal.jsx
git commit -m "feat(ui): SmartModal — primitivo modal genérico header/body/footer"
```

---

## Task 5: ConfirmModal — agregar prop `variant`

**Files:**
- Modify: `frontend/src/components/shared/ConfirmModal.jsx`

Actualmente `ConfirmModal` tiene `danger` (bool). Agregar `variant` ('danger' | 'warning' | 'info') para los casos de SmartOLT: rojo=delete, naranja=reboot, amarillo=disable, verde=enable.

- [ ] **Step 1: Actualizar `ConfirmModal.jsx`**

Reemplazar la función completa:

```jsx
// frontend/src/components/shared/ConfirmModal.jsx
import React, { useEffect } from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

const VARIANT_BTN = {
  danger:  'btn btn-danger',
  warning: 'btn btn-warning',
  info:    'btn btn-success',
  default: 'btn btn-primary',
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  danger = false,       // legacy — si danger=true, fuerza variant='danger'
  loading = false,
}) {
  const resolvedVariant = danger ? 'danger' : variant;
  const btnCls = VARIANT_BTN[resolvedVariant] ?? VARIANT_BTN.default;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', animation: 'fade-in 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          width: 420, maxWidth: '90vw',
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {resolvedVariant === 'danger' && (
              <IconAlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
            )}
            <span id="confirm-modal-title" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading} aria-label="Close" style={{ padding: 4 }}>
            <IconX size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 18px', minHeight: 48 }}>
          {message && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 18px', borderTop: '1px solid var(--border)',
        }}>
          <button className="btn" onClick={onClose} disabled={loading}>Close</button>
          <button
            className={btnCls}
            onClick={onConfirm}
            disabled={loading}
            style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="spinner" style={{ width: 12, height: 12 }} />
                Processing…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que el prop `danger` legacy sigue funcionando**

Buscar en el proyecto si alguna página usa `danger={true}`:

```bash
grep -r "danger={true}\|danger=" /home/juan/Pixel-Studios-OLT/frontend/src --include="*.jsx" | grep ConfirmModal | head -10
```

Si hay usos, verificar que siguen funcionando (el prop `danger` legacy está soportado en el nuevo código).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/ConfirmModal.jsx
git commit -m "feat(ui): ConfirmModal — prop variant con danger/warning/info"
```

---

## Task 6: StatusBadge — agregar power_fail y disabled

**Files:**
- Modify: `frontend/src/components/shared/StatusBadge.jsx`

Agregar los estados que SmartOLT usa: `power_fail` y `disabled`. También agregar `.status-disabled` y `.status-pwrfail` a `index.css`.

- [ ] **Step 1: Agregar CSS en `index.css`**

En la sección de status dots (cerca de `.status-los`), agregar:

```css
.status-pwrfail  { background: #FF9500; box-shadow: 0 0 6px #FF9500; animation: pulse-orange 2s infinite; }
.status-disabled { background: #8e8e93; }
```

- [ ] **Step 2: Actualizar `STATUS_CONFIG` en `StatusBadge.jsx`**

Reemplazar el objeto `STATUS_CONFIG`:

```jsx
const STATUS_CONFIG = {
  online:      { dotClass: 'status-online',    badgeClass: 'badge-green',  label: 'Online' },
  offline:     { dotClass: 'status-offline',   badgeClass: 'badge-gray',   label: 'Offline' },
  los:         { dotClass: 'status-los',        badgeClass: 'badge-red',    label: 'LOS' },
  power_fail:  { dotClass: 'status-pwrfail',   badgeClass: 'badge-orange', label: 'PwrFail' },
  pwrfail:     { dotClass: 'status-pwrfail',   badgeClass: 'badge-orange', label: 'PwrFail' },
  disabled:    { dotClass: 'status-disabled',  badgeClass: 'badge-gray',   label: 'Disabled' },
  pending:     { dotClass: 'status-pending',   badgeClass: 'badge-orange', label: 'Pending' },
  ztp:         { dotClass: 'status-pending',   badgeClass: 'badge-orange', label: 'ZTP' },
  error:       { dotClass: 'status-los',        badgeClass: 'badge-red',    label: 'Error' },
  warning:     { dotClass: 'status-pending',   badgeClass: 'badge-orange', label: 'Warning' },
  degraded:    { dotClass: 'status-pending',   badgeClass: 'badge-orange', label: 'Degraded' },
  maintenance: { dotClass: 'status-offline',   badgeClass: 'badge-purple', label: 'Maintenance' },
};
```

- [ ] **Step 3: Verificar en browser**

El Dashboard muestra ONTs con distintos estados. Verificar que los badges se renderizan correctamente.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/StatusBadge.jsx frontend/src/index.css
git commit -m "feat(ui): StatusBadge — agregar power_fail y disabled (SmartOLT)"
```

---

## Task 7: SignalBadge — 3 niveles SmartOLT

**Files:**
- Create: `frontend/src/components/shared/SignalBadge.jsx`

`SignalValue.jsx` no se borra (hay páginas que lo usan). `SignalBadge` es el nuevo componente que muestra Good/Warning/Critical como SmartOLT, con el valor dBm integrado.

- [ ] **Step 1: Crear `SignalBadge.jsx`**

```jsx
// frontend/src/components/shared/SignalBadge.jsx
import React from 'react';

function getSignalLevel(value) {
  if (value == null)  return { level: null,       cls: 'signal-unknown', label: '—' };
  if (value > -20)    return { level: 'good',     cls: 'signal-optimal', label: 'Good' };
  if (value >= -27)   return { level: 'warning',  cls: 'signal-warn',    label: 'Warning' };
  return               { level: 'critical', cls: 'signal-critical', label: 'Critical' };
}

/**
 * SignalBadge — muestra nivel de señal al estilo SmartOLT.
 *
 * @param {number|null} value       - dBm (ej: -21.3)
 * @param {boolean}     showValue   - si true, muestra el valor numérico junto al label
 * @param {boolean}     showLabel   - si true, muestra el label textual (Good/Warning/Critical)
 */
export default function SignalBadge({ value, showValue = true, showLabel = false }) {
  const { cls, label } = getSignalLevel(value);

  return (
    <span className={`mono ${cls}`} style={{ fontSize: 12, letterSpacing: '0.02em' }}>
      {value != null && showValue && (
        <>{value.toFixed(1)}<span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>dBm</span></>
      )}
      {showLabel && value != null && (
        <span style={{ marginLeft: showValue ? 4 : 0 }}>{label}</span>
      )}
      {value == null && '—'}
    </span>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/SignalBadge.jsx
git commit -m "feat(ui): SignalBadge — Good/Warning/Critical al estilo SmartOLT"
```

---

## Task 8: StatBox — KPI box extraído de Dashboard

**Files:**
- Create: `frontend/src/components/shared/StatBox.jsx`
- Modify: `frontend/src/pages/Dashboard/index.jsx` (usar StatBox importado)

- [ ] **Step 1: Crear `StatBox.jsx`**

```jsx
// frontend/src/components/shared/StatBox.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const COLOR_MAP = {
  blue:   { bg: 'var(--sol-blue)',   bgHover: 'var(--sol-blue2)' },
  green:  { bg: 'var(--sol-green)',  bgHover: 'var(--sol-green2)' },
  slate:  { bg: 'var(--sol-slate)',  bgHover: 'var(--sol-slate2)' },
  orange: { bg: 'var(--sol-orange)', bgHover: 'var(--sol-orange2)' },
};

/**
 * StatBox — KPI box cliqueable, estilo SmartOLT.
 *
 * @param {string}    to       - ruta de navegación (react-router)
 * @param {string}    color    - 'blue' | 'green' | 'slate' | 'orange'
 * @param {ReactNode} icon     - ícono (ej: <IconCircleCheck size={30} />)
 * @param {string|number} value  - número o texto principal
 * @param {string}    label    - etiqueta debajo del número
 * @param {string[]}  footer   - líneas de desglose opcionales
 */
export default function StatBox({ to, color = 'blue', icon, value, label, footer }) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <NavLink
      to={to}
      className="sol-statbox"
      style={{ background: colors.bg, textDecoration: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.background = colors.bgHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = colors.bg; }}
    >
      <span className="ico" style={{ opacity: 0.85 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
          {value ?? '—'}
        </div>
        <div className="lbl" style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
          {label}
        </div>
      </div>
      {footer?.length > 0 && (
        <div className="foot" style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4,
          fontSize: 10.5, color: 'rgba(255,255,255,0.75)',
        }}>
          {footer.map((f, i) => <span key={i}>{f}</span>)}
        </div>
      )}
    </NavLink>
  );
}
```

Agregar en `index.css` si no existe el bloque `.sol-statbox`:

```css
/* KPI Stat Box */
.sol-statbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
  min-width: 180px;
  flex: 1;
}
.sol-statbox .ico { color: rgba(255,255,255,0.9); flex-shrink: 0; }
```

- [ ] **Step 2: Reemplazar `StatBox` inline en `Dashboard/index.jsx`**

En `Dashboard/index.jsx` hay una función `StatBox` local. Reemplazarla importando el componente compartido:

Agregar al bloque de imports:
```jsx
import StatBox from '../../components/shared/StatBox';
```

Eliminar la función `function StatBox(...)` local del archivo.

Actualizar los usos. La función local tenía props `{ to, cls, Icon, num, label, foot }`. El nuevo componente usa `{ to, color, icon, value, label, footer }`. Buscar todos los `<StatBox` en el Dashboard y actualizar props:

```jsx
// Antes:
<StatBox to="/onu/unconfigured" cls="blue"   Icon={IconWand}         num={fmt(d?.unconfigured ?? 0)} label="Waiting authorization" foot={['D: 0', 'Resync: 0', `New: ${d?.unconfigured ?? 0}`]} />
<StatBox to="/onu/configured"   cls="green"  Icon={IconCircleCheck}  num={fmt(d?.online ?? 0)}       label="Online"                foot={[`Total auth: ${fmt(d?.total ?? 0)}`]} />
<StatBox to="/onu/configured"   cls="slate"  Icon={IconX}            num={fmt(d?.offline ?? 0)}      label="Total offline"         foot={[`PwrFail: ${d?.pwrFail ?? 0}`, `LoS: ${d?.los ?? 0}`, `N/A: ${d?.na ?? 0}`]} />
<StatBox to="/diagnostics"      cls="orange" Icon={IconAlertTriangle} num={fmt(d?.lowSignal ?? 0)}   label="Low signals"           foot={[`Warning: ${d?.sigWarn ?? 0}`, `Critical: ${d?.sigCrit ?? 0}`]} />

// Después:
<StatBox to="/onu/unconfigured" color="blue"   icon={<IconWand size={30} />}          value={fmt(d?.unconfigured ?? 0)} label="Waiting authorization" footer={['D: 0', 'Resync: 0', `New: ${d?.unconfigured ?? 0}`]} />
<StatBox to="/onu/configured"   color="green"  icon={<IconCircleCheck size={30} />}   value={fmt(d?.online ?? 0)}       label="Online"                footer={[`Total auth: ${fmt(d?.total ?? 0)}`]} />
<StatBox to="/onu/configured"   color="slate"  icon={<IconX size={30} />}             value={fmt(d?.offline ?? 0)}      label="Total offline"         footer={[`PwrFail: ${d?.pwrFail ?? 0}`, `LoS: ${d?.los ?? 0}`, `N/A: ${d?.na ?? 0}`]} />
<StatBox to="/diagnostics"      color="orange" icon={<IconAlertTriangle size={30} />} value={fmt(d?.lowSignal ?? 0)}    label="Low signals"           footer={[`Warning: ${d?.sigWarn ?? 0}`, `Critical: ${d?.sigCrit ?? 0}`]} />
```

- [ ] **Step 3: Verificar en browser**

Abrir el Dashboard. Los 4 KPI boxes deben verse igual que antes. Al hacer clic en cada uno, navega a la ruta correcta.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/StatBox.jsx frontend/src/pages/Dashboard/index.jsx frontend/src/index.css
git commit -m "feat(ui): StatBox — KPI box extraído a componente compartido"
```

---

## Task 9: Pagination — control independiente

**Files:**
- Create: `frontend/src/components/shared/Pagination.jsx`

- [ ] **Step 1: Crear `Pagination.jsx`**

```jsx
// frontend/src/components/shared/Pagination.jsx
import React from 'react';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);

  const pages = buildPageList(page, totalPages);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 8, paddingTop: 8, fontSize: 12, color: 'var(--text-secondary)',
    }}>
      {/* Selector de tamaño */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Show</span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="input-base"
          style={{ width: 70, padding: '3px 6px', fontSize: 12 }}
        >
          {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span>entries</span>
      </div>

      {/* Texto de rango */}
      <span style={{ color: 'var(--text-muted)' }}>
        {totalItems === 0 ? 'No entries' : `Showing ${from} to ${to} of ${totalItems} entries`}
      </span>

      {/* Botones de paginación */}
      <div style={{ display: 'flex', gap: 3 }}>
        <PageBtn onClick={() => onPageChange(1)}           disabled={page === 1}          title="First">
          <IconChevronsLeft size={13} />
        </PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)}    disabled={page === 1}          title="Previous">
          <IconChevronLeft size={13} />
        </PageBtn>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '3px 6px', color: 'var(--text-muted)' }}>…</span>
          ) : (
            <PageBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PageBtn>
          )
        )}

        <PageBtn onClick={() => onPageChange(page + 1)}    disabled={page === totalPages} title="Next">
          <IconChevronRight size={13} />
        </PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)}   disabled={page === totalPages} title="Last">
          <IconChevronsRight size={13} />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, active, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '3px 7px', fontSize: 12, borderRadius: 3,
        border: '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--card-bg)',
        color: active ? '#fff' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/Pagination.jsx
git commit -m "feat(ui): Pagination — control de paginación SmartOLT-like"
```

---

## Task 10: SmartTable — tabla server-side con checkbox y paginación

**Files:**
- Create: `frontend/src/components/shared/SmartTable.jsx`

`DataTable.jsx` sigue existiendo (no se borra). `SmartTable` soporta tanto modo client-side como server-side, y agrega checkbox de selección para batch actions.

- [ ] **Step 1: Crear `SmartTable.jsx`**

```jsx
// frontend/src/components/shared/SmartTable.jsx
import React, { useState, useMemo } from 'react';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import Pagination from './Pagination';

/**
 * SmartTable — tabla paginada y sorteable al estilo SmartOLT DataTables.
 *
 * Soporta dos modos:
 *   - Client-side: pasar `data` + `totalItems` opcional. La tabla filtra/sortea/pagina localmente.
 *   - Server-side: pasar `data` (solo la página actual) + `totalItems` + `onPageChange` + `onPageSizeChange` + `onSortChange`.
 *     En server-side, la tabla NO sortea ni pagina localmente — solo emite eventos.
 *
 * @param {Object[]} columns          - [{ key, label, render?, sortKey?, width?, align? }]
 * @param {Object[]} data             - filas (página actual en server-side)
 * @param {number}   totalItems       - total de items para paginación
 * @param {boolean}  loading          - muestra skeleton
 * @param {boolean}  serverSide       - si true, no pagina/sortea localmente
 * @param {number}   page             - página actual (server-side)
 * @param {number}   pageSize         - tamaño de página (server-side)
 * @param {string}   sortKey          - columna de sort activa (server-side)
 * @param {string}   sortDir          - 'asc' | 'desc' (server-side)
 * @param {function} onPageChange     - (page: number) => void
 * @param {function} onPageSizeChange - (size: number) => void
 * @param {function} onSortChange     - (key: string, dir: 'asc'|'desc') => void
 * @param {boolean}  selectable       - si true, muestra checkbox por fila
 * @param {string[]} selectedIds      - ids seleccionados (requiere selectable=true)
 * @param {function} onSelectChange   - (ids: string[]) => void
 * @param {string}   rowKey           - campo que identifica cada fila (default: 'id')
 * @param {string}   emptyMessage     - texto cuando no hay datos
 * @param {string}   className        - clase extra para el contenedor
 */
export default function SmartTable({
  columns = [],
  data = [],
  totalItems,
  loading = false,
  serverSide = false,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
  sortKey: sortKeyProp = null,
  sortDir: sortDirProp = 'asc',
  onPageChange,
  onPageSizeChange,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectChange,
  rowKey = 'id',
  emptyMessage = 'No data',
  className = '',
}) {
  // Client-side state
  const [clientPage, setClientPage]         = useState(1);
  const [clientPageSize, setClientPageSize] = useState(25);
  const [clientSortKey, setClientSortKey]   = useState(null);
  const [clientSortDir, setClientSortDir]   = useState('asc');

  const page     = serverSide ? pageProp     : clientPage;
  const pageSize = serverSide ? pageSizeProp : clientPageSize;
  const sortKey  = serverSide ? sortKeyProp  : clientSortKey;
  const sortDir  = serverSide ? sortDirProp  : clientSortDir;

  const handlePageChange = (p) => {
    if (serverSide) onPageChange?.(p);
    else setClientPage(p);
  };
  const handlePageSizeChange = (s) => {
    if (serverSide) { onPageSizeChange?.(s); onPageChange?.(1); }
    else { setClientPageSize(s); setClientPage(1); }
  };
  const handleSort = (key) => {
    if (!key) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    if (serverSide) onSortChange?.(key, newDir);
    else { setClientSortKey(key); setClientSortDir(newDir); setClientPage(1); }
  };

  // Client-side processing
  const processed = useMemo(() => {
    if (serverSide) return data;
    let rows = [...data];
    if (clientSortKey) {
      rows.sort((a, b) => {
        const va = a[clientSortKey] ?? '';
        const vb = b[clientSortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return clientSortDir === 'asc' ? cmp : -cmp;
      });
    }
    const start = (clientPage - 1) * clientPageSize;
    return rows.slice(start, start + clientPageSize);
  }, [serverSide, data, clientSortKey, clientSortDir, clientPage, clientPageSize]);

  const total = totalItems ?? (serverSide ? 0 : data.length);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Selección
  const allPageIds = processed.map(r => String(r[rowKey]));
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id));
  const someSelected = !allSelected && allPageIds.some(id => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) onSelectChange?.(selectedIds.filter(id => !allPageIds.includes(id)));
    else onSelectChange?.([...new Set([...selectedIds, ...allPageIds])]);
  };
  const toggleRow = (id) => {
    const sid = String(id);
    if (selectedIds.includes(sid)) onSelectChange?.(selectedIds.filter(x => x !== sid));
    else onSelectChange?.([...selectedIds, sid]);
  };

  const SKELETON_ROWS = 8;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
        <table className="table-base" style={{ minWidth: 600 }}>
          <thead style={{ background: 'var(--content-bg)', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              {selectable && (
                <th style={{ width: 36, paddingLeft: 12 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortKey && handleSort(col.sortKey)}
                  style={{
                    cursor: col.sortKey ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    textAlign: col.align ?? 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortKey && sortKey === col.sortKey && (
                      sortDir === 'asc'
                        ? <IconChevronUp size={11} />
                        : <IconChevronDown size={11} />
                    )}
                    {col.sortKey && sortKey !== col.sortKey && (
                      <span style={{ opacity: 0.3 }}><IconChevronUp size={11} /></span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td />}
                  {columns.map(col => (
                    <td key={col.key}>
                      <span style={{
                        display: 'inline-block', height: 12, borderRadius: 3,
                        width: '70%', background: 'var(--border)', opacity: 0.5,
                        animation: 'pulse-opacity 1.4s ease infinite',
                        animationDelay: `${i * 0.06}s`,
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : processed.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : processed.map((row, i) => {
              const rid = String(row[rowKey]);
              const isSelected = selectedIds.includes(rid);
              return (
                <tr
                  key={rid || i}
                  style={{ background: isSelected ? 'rgba(0,122,255,0.08)' : undefined }}
                >
                  {selectable && (
                    <td style={{ paddingLeft: 12, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(rid)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
```

Agregar en `index.css` la animación de skeleton:

```css
@keyframes pulse-opacity {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.2; }
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/SmartTable.jsx frontend/src/index.css
git commit -m "feat(ui): SmartTable — tabla server-side/client-side con checkbox y paginación SmartOLT"
```

---

## Task 11: MultiSelect — dropdown de selección múltiple

**Files:**
- Create: `frontend/src/components/shared/MultiSelect.jsx`

- [ ] **Step 1: Crear `MultiSelect.jsx`**

```jsx
// frontend/src/components/shared/MultiSelect.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IconChevronDown, IconX } from '@tabler/icons-react';

/**
 * MultiSelect — dropdown con búsqueda y selección múltiple.
 *
 * @param {Object[]} options          - [{ value, label }]
 * @param {any[]}    value            - valores seleccionados
 * @param {function} onChange         - (selected: any[]) => void
 * @param {string}   placeholder      - texto cuando no hay selección
 * @param {boolean}  searchable       - habilita búsqueda interna (default true)
 * @param {number}   maxHeight        - altura máx del dropdown (default 220)
 * @param {string}   className        - clase extra
 */
export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  searchable = true,
  maxHeight = 220,
  className = '',
}) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef(null);
  const searchRef             = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
    if (!open) setSearch('');
  }, [open, searchable]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (val) => {
    if (value.includes(val)) onChange(value.filter(v => v !== val));
    else onChange([...value, val]);
  };

  const selectAll  = () => onChange(options.map(o => o.value));
  const clearAll   = () => onChange([]);

  const selectedLabels = options
    .filter(o => value.includes(o.value))
    .map(o => o.label);

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', minWidth: 120 }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4,
          background: 'var(--content-bg)', cursor: 'pointer', minHeight: 30, gap: 4,
          fontSize: 12, color: value.length ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, flex: 1, overflow: 'hidden' }}>
          {value.length === 0 && <span>{placeholder}</span>}
          {value.length > 0 && value.length <= 2 && selectedLabels.map((lbl, i) => (
            <span key={i} style={{
              background: 'var(--primary)', color: '#fff',
              borderRadius: 3, padding: '0 5px', fontSize: 11,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              {lbl}
              <IconX size={9} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggle(value[i]); }} />
            </span>
          ))}
          {value.length > 2 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {value.length} selected
            </span>
          )}
        </div>
        <IconChevronDown size={13} style={{ flexShrink: 0, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 600,
          background: 'var(--sidebar-bg)', border: '1px solid var(--border-light)',
          borderRadius: 4, boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          marginTop: 2, overflow: 'hidden',
        }}>
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="input-base"
                style={{ padding: '3px 7px', fontSize: 12 }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={selectAll}  className="btn" style={{ fontSize: 11, padding: '1px 6px' }}>All</button>
            <button onClick={clearAll}   className="btn" style={{ fontSize: 11, padding: '1px 6px' }}>Clear</button>
          </div>

          <div style={{ maxHeight, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>No options</div>
            ) : filtered.map(opt => {
              const selected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: selected ? 'var(--primary)' : 'var(--text-primary)',
                    background: selected ? 'rgba(0,122,255,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <input type="checkbox" checked={selected} readOnly style={{ flexShrink: 0 }} />
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/MultiSelect.jsx
git commit -m "feat(ui): MultiSelect — dropdown multi-selección con búsqueda"
```

---

## Task 12: FilterBar — contenedor colapsable de filtros

**Files:**
- Create: `frontend/src/components/shared/FilterBar.jsx`

- [ ] **Step 1: Crear `FilterBar.jsx`**

```jsx
// frontend/src/components/shared/FilterBar.jsx
import React, { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconFilter } from '@tabler/icons-react';

/**
 * FilterBar — contenedor colapsable para barras de filtros.
 *
 * @param {ReactNode} children      - controles de filtro
 * @param {function}  onApply       - llamada al hacer clic en "Apply"
 * @param {function}  onReset       - llamada al hacer clic en "Reset"
 * @param {boolean}   defaultOpen   - estado inicial (default true)
 * @param {string}    title         - etiqueta del toggle (default 'Filters')
 * @param {boolean}   hideActions   - oculta botones Apply/Reset (para filtros que se aplican al cambiar)
 */
export default function FilterBar({
  children,
  onApply,
  onReset,
  defaultOpen = true,
  title = 'Filters',
  hideActions = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ marginBottom: 12, padding: 0 }}>
      {/* Header del toggle */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <IconFilter size={13} />
          {title}
        </span>
        {open ? <IconChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
               : <IconChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {/* Contenido */}
      {open && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            {children}
            {!hideActions && (
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                {onReset && (
                  <button className="btn" onClick={onReset} style={{ fontSize: 12 }}>
                    Reset
                  </button>
                )}
                {onApply && (
                  <button className="btn btn-primary" onClick={onApply} style={{ fontSize: 12 }}>
                    Apply
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/FilterBar.jsx
git commit -m "feat(ui): FilterBar — contenedor colapsable para filtros SmartOLT-like"
```

---

## Task 13: Marcadores de deprecación + commit final

**Files:**
- Modify: `frontend/src/components/shared/DataTable.jsx`
- Modify: `frontend/src/components/shared/ActionModal.jsx`
- Modify: `frontend/src/components/shared/SignalValue.jsx`

Los archivos deprecados se marcan con un comentario en la primera línea. No se borran — se borran en Fase 8 cuando todas las páginas ya usan los nuevos primitivos.

- [ ] **Step 1: Marcar `DataTable.jsx` como deprecado**

Agregar al inicio del archivo (antes del `import`):

```jsx
// @deprecated — usar SmartTable de '../../components/shared/SmartTable'. Borrar en Fase 8.
```

- [ ] **Step 2: Marcar `ActionModal.jsx` como deprecado**

Agregar al inicio:

```jsx
// @deprecated — usar SmartModal de '../../components/shared/SmartModal'. Borrar en Fase 8.
```

- [ ] **Step 3: Marcar `SignalValue.jsx` como deprecado**

Agregar al inicio:

```jsx
// @deprecated — usar SignalBadge de '../../components/shared/SignalBadge'. Borrar en Fase 8.
```

- [ ] **Step 4: Verificar que la app carga sin errores**

```bash
cd /home/juan/Pixel-Studios-OLT/frontend
npm run build 2>&1 | tail -5
```

Expected: algo como `✓ built in Xs` sin errores. Abrir `http://localhost:5173` y navegar por Dashboard, ONTs y ONU individual para verificar que no hay regresiones visuales.

- [ ] **Step 5: Commit final Fase 0**

```bash
git add frontend/src/components/shared/DataTable.jsx \
        frontend/src/components/shared/ActionModal.jsx \
        frontend/src/components/shared/SignalValue.jsx
git commit -m "chore(ui): marcar DataTable/ActionModal/SignalValue como deprecados (Fase 8)"
```

---

## Checklist de completitud — Fase 0

Antes de cerrar esta fase, verificar en el browser:

- [ ] La nav muestra: Unconfigured, Configured, Graphs, Diagnostics, Reports▼, Config mismatches, Locations▼, Admin▼, Save config
- [ ] Hacer clic en "Save config" abre el modal con "No, cancel" / "Yes, save configuration"
- [ ] Las rutas `/onu/configured`, `/onu/view/:id`, `/locations/listing`, `/odbs/listing`, `/onu_types/listing`, `/onu_authorization_presets/listing`, `/config_comparison`, `/speed_profiles`, `/system_config`, `/olt` cargan correctamente
- [ ] Las rutas viejas (`/onts`, `/zones`, `/onu-types`, `/config-comparison`, etc.) redirigen sin error 404
- [ ] El Dashboard muestra los 4 KPI boxes clicableables con color correcto
- [ ] Las páginas existentes no tienen errores en consola del browser
- [ ] `npm run build` termina sin errores

Una vez completado, iniciar Fase 1 (Dashboard — gaps D12, D13, D14) con un nuevo spec + plan.
