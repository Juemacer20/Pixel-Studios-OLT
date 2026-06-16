# Spec: SmartOLT Clone — Pixel Studios OLT

**Fecha:** 2026-06-16  
**Referencia:** SmartOLT v3.53.0 (RELEVAMIENTO_COMPLETO_SMARTOLT.md) + MATRIZ_MAESTRA_PARIDAD.md  
**Stack:** React 18 + Vite + Tailwind CSS v3 + Zustand + TanStack Query  
**Backend:** Node.js + Express + Prisma — ya completo, no se toca en este ciclo  

---

## Objetivo

Convertir Pixel Studios OLT en un clon funcional y visual de SmartOLT. Cada pestaña, cada función, cada botón, cada modal, cada gráfico y cada dato deben replicar SmartOLT exactamente en layout y comportamiento. La tecnología es moderna (React/Tailwind), el look-and-feel es idéntico a SmartOLT.

---

## Decisión de estilo

- **Tecnología:** React 18 + Tailwind CSS v3 (sin cambio de stack)
- **Visual:** mismo layout, estructura y colores _aproximados_ de SmartOLT — no Bootstrap 3 literal
- **Modo:** dark mode como default actual; light mode como fallback Bootstrap-3-like ya definido en `index.css`
- **Tipografía:** Inter (ya configurada), 14px base

---

## Arquitectura de fases

El proyecto se ejecuta en 9 fases secuenciales. Cada fase tiene su propio plan de implementación. Ninguna fase comienza hasta que la anterior está completa.

```
Fase 0  ── Component Library SmartOLT-like          ← ESTE SPEC
Fase 1  ── Dashboard (gaps D12, D13, D14)
Fase 2  ── ONUs configuradas (gaps C23, C36–C49 + layout)
Fase 3  ── Vista ONU individual (gaps V37, V38, V70–V73)
Fase 4  ── ONUs no configuradas (pulido visual)
Fase 5  ── Diagnósticos + Gráficos (pulido visual)
Fase 6  ── Reportes (pulido visual)
Fase 7  ── Admin pages (Zones, ODBs, ONU Types, Speed Profiles, OLTs, VPN/TR069, Auth Presets, Settings)
Fase 8  ── Config mismatches + Save Config modal global + gaps de datos + pulido final
```

Cada fase Fase N+1 produce un spec separado al momento de ejecutarse.

---

## Fase 0: Component Library

### Propósito

Construir los primitivos visuales que todas las páginas consumen. Sin esta biblioteca, cada página tiene inconsistencias de estilo. Con ella, cada fase siguiente es predecible y rápida.

### Patrones globales

#### Save Configuration Modal — contexto React

SmartOLT muestra este modal en **todas las páginas**. Se implementa como React Context para que cualquier página pueda invocarlo sin prop-drilling.

```
AppLayout
  └── SaveConfigProvider          ← wrappea todo el árbol
        ├── Sidebar
        ├── TopNav
        ├── <Outlet />            ← páginas
        └── SaveConfigModal       ← siempre montado, invisible hasta invocar
```

API del contexto:
```js
const { openSaveConfig } = useSaveConfig()
// cualquier página llama openSaveConfig() para abrir el modal
```

Modal tiene dos botones: "No, cancel" (cierra) y "Yes, save configuration" (llama `POST /api/onts/save-config` o equivalente).

#### Rutas — alinear con SmartOLT

Renombrar rutas en `App.jsx` para que coincidan con SmartOLT:

| SmartOLT path | Ruta actual | Nueva ruta |
|---|---|---|
| `/onu/unconfigured` | `/unconfigured` | `/onu/unconfigured` |
| `/onu/configured` | `/onts` | `/onu/configured` |
| `/onu/view/:id` | `/onts/:id` | `/onu/view/:id` |
| `/onu_types/listing` | `/onu-types` | `/onu_types/listing` |
| `/locations/listing` | `/zones` | `/locations/listing` |
| `/odbs/listing` | `/odbs` | `/odbs/listing` |
| `/onu_authorization_presets/listing` | `/auth-presets` | `/onu_authorization_presets/listing` |

Los `NavLink` en el Sidebar se actualizan en simultáneo.

#### Datos faltantes

Cuando un campo no está disponible en la API, la UI muestra `—`. No se lanza error ni se bloquea el render. Los gaps de datos reales se resuelven en Fase 8.

---

### Componentes a construir

#### 1. `<Sidebar>` — actualizar orden de navegación y rutas

Navegación exacta según SmartOLT (orden estricto, submenús colapsables):

```
[Logo / SMARTOLT]
─────────────────
Unconfigured          → /onu/unconfigured
Configured            → /onu/configured
Graphs                → /graphs
Diagnostics           → /diagnostics
Reports ▼
  Tasks               → /reports/tasks
  Authorizations      → /reports/authorizations/list
  Export              → /reports/export
  Import              → /reports/import  (si existe página)
Config mismatches     → /config_comparison
Locations ▼
  Zones               → /locations/listing
  ODBs                → /odbs/listing
ONU types             → /onu_types/listing
Speed profiles        → /speed_profiles
OLTs                  → /olt
VPN & TR069           → /system_config
Authorization presets → /onu_authorization_presets/listing
Settings ▼
  General             → /general
  Users               → /users
  Edit user           → /auth
```

El ítem activo tiene fondo resaltado. Los submenús se expanden al hacer clic. El sidebar es colapsable a iconos (220px → 52px), comportamiento ya implementado.

#### 2. `<StatBox>` — extraer de Dashboard, hacer primitivo reutilizable

Props:
```ts
{
  to: string           // ruta de navegación al hacer clic
  color: 'blue' | 'green' | 'slate' | 'orange'
  icon: ReactNode      // ícono Tabler
  value: number | string
  label: string
  footer?: string[]    // líneas de desglose ("PwrFail: 239 | LoS: 15 | N/A: 857")
}
```

Colores de fondo exactos (de `index.css` existente):
- `blue` → `--sol-blue` (#007AFF)
- `green` → `--sol-green` (#34C759)
- `slate` → `--sol-slate` (#5a6b7d)
- `orange` → `--sol-orange` (#FF9500)

Al hacer clic navega a `to`. El número es el elemento visual dominante.

#### 3. `<SmartTable>` — reemplaza `DataTable.jsx`

Tabla server-side con todas las capacidades que SmartOLT usa:

- Columnas configurables (array de `{ key, label, render?, sortable?, width? }`)
- Checkbox de selección por fila (para batch actions)
- Sorting: click en header alterna ASC/DESC, flecha visual
- Paginación integrada: selector 25/50/100, botones Prev/Next/First/Last, "Showing X to Y of Z entries"
- Estado vacío con `<EmptyState>` existente
- Estado de carga con skeleton rows
- `className` prop para personalización por página

La paginación se extrae como `<Pagination>` independiente para reusar fuera de tablas.

#### 4. `<SmartModal>` — reemplaza / extiende `ActionModal.jsx`

Modal Bootstrap-like con tres secciones:

```
┌─────────────────────────────────┐
│ [Título]                    [×] │  ← header
├─────────────────────────────────┤
│  contenido (children)           │  ← body
├─────────────────────────────────┤
│              [Close] [Acción]   │  ← footer
└─────────────────────────────────┘
```

Props:
```ts
{
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode    // si omitido, footer default con Close
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
```

El `×` del header y el botón "Close" del footer llaman `onClose`.

#### 5. `<ConfirmModal>` — mantener, agregar variantes de color

Extiende el existente con prop `variant`:

```ts
variant: 'danger' | 'warning' | 'info'
// danger  → botón rojo   (Delete, Stop)
// warning → botón naranja (Reboot) o amarillo (Disable, Resync)
// info    → botón verde   (Enable, Start, Authorize)
```

#### 6. `<SmartButton>` — nuevo primitivo

Reemplaza los `className` de botón inline dispersos en componentes:

```ts
{
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'default' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean    // muestra spinner, deshabilita
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  children: ReactNode
}
```

Mapeo de colores (Tailwind):
- `primary` → azul (`--accent`)
- `success` → verde (`--success`)
- `warning` → naranja/amarillo (`--warning`)
- `danger` → rojo (`--danger`)
- `default` → gris neutro (borde + texto)

#### 7. `<MultiSelect>` — nuevo

Dropdown con búsqueda interna y selección múltiple. Usado en todas las barras de filtros (OLT filter, Board filter, Port filter, etc.).

Props:
```ts
{
  options: { value: string | number; label: string }[]
  value: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  placeholder?: string
  searchable?: boolean   // default true
  maxHeight?: number     // altura del dropdown
}
```

Muestra chips de los seleccionados con `×` para remover. Tiene "Select all" / "Clear all".

#### 8. `<FilterBar>` — nuevo

Contenedor colapsable para barras de filtros largas (Configured ONUs tiene 24 filtros).

```
[▼ Filters]  ← toggle, colapsable
┌────────────────────────────────────────┐
│ [Search] [OLT▼] [Board▼] [Port▼] ...  │
│ [Zone▼] [ODB▼] [VLAN▼] ...            │
│                      [Apply] [Reset]   │
└────────────────────────────────────────┘
```

Props:
```ts
{
  children: ReactNode
  onApply: () => void
  onReset: () => void
  defaultOpen?: boolean   // default true
}
```

#### 9. `<SignalBadge>` — reemplaza `SignalValue.jsx`

Muestra el nivel de señal con color y etiqueta:

| Rango RX (dBm) | Color | Label |
|---|---|---|
| ≥ -20 | verde | Good |
| -20 a -27 | amarillo | Warning |
| < -27 | rojo | Critical |
| null/—  | gris | — |

Props: `{ value: number | null; showLabel?: boolean }`

#### 10. `<StatusBadge>` — revisar y actualizar

Estados SmartOLT con colores exactos:

| Estado | Color |
|---|---|
| Online | verde |
| Offline | gris/slate |
| LOS | rojo |
| Power Fail | naranja |
| Disabled | amarillo |

#### 11. `<Pagination>` — extraído de SmartTable, independiente

```ts
{
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]   // default [25, 50, 100]
}
```

Muestra: selector de tamaño + "Showing X to Y of Z entries" + botones First/Prev/[1][2][3].../Next/Last.

#### 12. `<SaveConfigModal>` — nuevo, vía contexto

```ts
// Provider en AppLayout
<SaveConfigProvider>...</SaveConfigProvider>

// Hook en cualquier página
const { openSaveConfig } = useSaveConfig()

// Modal renders una vez en el Provider
```

Botones: "No, cancel" (cierra) | "Yes, save configuration" (llama endpoint + cierra).

---

### Estructura de archivos resultante

```
frontend/src/
├── context/
│   └── SaveConfigContext.jsx        ← NUEVO
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx              ← ACTUALIZAR (rutas + orden nav)
│   │   ├── TopNav.jsx               ← mantener (no cambios en Fase 0)
│   │   ├── SaveConfigModal.jsx      ← NUEVO
│   │   ├── AlertBanner.jsx          ← mantener
│   │   └── UpdateBanner.jsx         ← mantener
│   └── shared/
│       ├── SmartTable.jsx           ← NUEVO (reemplaza DataTable.jsx)
│       ├── SmartModal.jsx           ← NUEVO (reemplaza/extiende ActionModal.jsx)
│       ├── SmartButton.jsx          ← NUEVO
│       ├── MultiSelect.jsx          ← NUEVO
│       ├── FilterBar.jsx            ← NUEVO
│       ├── StatBox.jsx              ← NUEVO (extraído de Dashboard)
│       ├── SignalBadge.jsx          ← NUEVO (reemplaza SignalValue.jsx)
│       ├── StatusBadge.jsx          ← ACTUALIZAR
│       ├── ConfirmModal.jsx         ← ACTUALIZAR (variantes color)
│       ├── Pagination.jsx           ← NUEVO
│       ├── DataTable.jsx            ← DEPRECAR (reemplazado por SmartTable)
│       ├── ActionModal.jsx          ← DEPRECAR (reemplazado por SmartModal)
│       ├── SignalValue.jsx          ← DEPRECAR (reemplazado por SignalBadge)
│       ├── CopyButton.jsx           ← mantener
│       ├── EmptyState.jsx           ← mantener
│       ├── SearchInput.jsx          ← mantener
│       ├── BrandTag.jsx             ← mantener
│       └── Drawer.jsx               ← mantener
└── App.jsx                          ← ACTUALIZAR (rutas renombradas)
```

---

### Criterios de completitud de Fase 0

- [ ] `SaveConfigProvider` wrappea `AppLayout`, `useSaveConfig()` funciona en cualquier página
- [ ] Rutas renombradas en `App.jsx` y `Sidebar.jsx` sin links rotos
- [ ] `Sidebar` muestra los ítems en orden exacto de SmartOLT con submenús colapsables
- [ ] `<SmartTable>` renderiza con sorting + paginación 25/50/100 + checkbox de selección
- [ ] `<SmartModal>` tiene header/body/footer con botón Close
- [ ] `<ConfirmModal>` acepta prop `variant` con colores correctos
- [ ] `<SmartButton>` renderiza las 5 variantes de color
- [ ] `<MultiSelect>` con búsqueda, chips, select-all/clear-all
- [ ] `<FilterBar>` colapsable con Apply/Reset
- [ ] `<SignalBadge>` muestra Good/Warning/Critical con colores correctos
- [ ] `<StatusBadge>` muestra Online/Offline/LOS/PwrFail/Disabled con colores correctos
- [ ] `<StatBox>` es cliqueables y navega a la ruta correcta
- [ ] `<Pagination>` independiente funciona
- [ ] `DataTable.jsx`, `ActionModal.jsx`, `SignalValue.jsx` deprecados (no borrados — se borran en Fase 8)
- [ ] No hay regresiones visuales en páginas existentes

---

## Fases 1–8: specs bajo demanda

Cada fase siguiente se especifica en un documento separado al momento de ejecutarse, usando el relevamiento y la matriz de paridad como referencia. Los gaps específicos por módulo están documentados en `MATRIZ_MAESTRA_PARIDAD.md`.

---

## Restricciones

- El backend **no se toca** en este ciclo (ya está completo). Si un endpoint falta, se mockea con `—` en la UI.
- No se agregan dependencias nuevas sin justificación (el stack actual es suficiente para todos los componentes).
- No se reescribe lógica de negocio existente que funcione. Solo se reemplaza presentación.
- Los archivos deprecados (`DataTable.jsx`, `ActionModal.jsx`, `SignalValue.jsx`) se mantienen hasta Fase 8 para no romper páginas que todavía no fueron migradas.
