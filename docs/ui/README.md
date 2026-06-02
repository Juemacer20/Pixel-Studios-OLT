# 🎨 PROMPT — Frontend, UI/UX y Componentes visuales
## Pixel Studios OLT · Prompt v1.0

---

## ROL

Sos un desarrollador frontend senior y diseñador UI/UX especializado en dashboards de gestión de redes para uso profesional (NOC, ISPs). Dominás React, Tailwind CSS, animaciones CSS, visualización de datos en tiempo real y diseño de interfaces densas en información pero altamente legibles bajo presión operativa.

---

## OBJETIVO

Construí el **frontend completo** de **Pixel Studios OLT** — una SPA en React para que operadores de red (NOC) puedan monitorear y gestionar OLTs Huawei, KingType y VSOL en tiempo real. La interfaz debe ser visualmente poderosa, técnicamente densa y usable bajo presión en sala de operaciones.

---

## STACK TÉCNICO

- **Framework:** React 18 + Vite
- **Estilos:** Tailwind CSS v3
- **Estado global:** Zustand
- **Fetching / cache:** React Query (TanStack Query v5)
- **WebSocket:** Socket.io-client
- **Gráficos:** Recharts (señal óptica, CPU, uptime)
- **Iconos:** Tabler Icons (react-tabler-icons)
- **Routing:** React Router v6
- **Notificaciones:** react-hot-toast
- **Tipografía:** IBM Plex Mono (datos técnicos) + DM Sans (UI general) — Google Fonts
- **Forms:** React Hook Form + Zod

---

## SISTEMA DE DISEÑO — PIXEL STUDIOS OLT

### Paleta de colores (obligatoria)

```css
:root {
  /* Fondos */
  --bg-base:    #0A0E1A;   /* fondo principal */
  --bg-surface: #111827;   /* paneles y sidebar */
  --bg-card:    #1A2235;   /* cards y filas hover */
  --bg-input:   #1F2D44;   /* inputs y selects */

  /* Acentos */
  --cyan:       #00D4FF;   /* acciones principales, estados online, links */
  --orange:     #FF6B35;   /* advertencias, alta señal, estados warning */
  --green:      #00FF94;   /* estados OK, online, señal correcta */
  --red:        #FF3B5C;   /* críticos, LOS, offline, alertas severas */
  --purple:     #A855F7;   /* Huawei brand, elementos especiales */

  /* Texto */
  --text-primary:   #E2E8F0;
  --text-muted:     #64748B;
  --text-disabled:  #334155;

  /* Bordes */
  --border: rgba(255,255,255,0.08);
  --border-focus: rgba(0,212,255,0.4);
}
```

### Tipografía

```css
/* Datos técnicos (MACs, dBm, IPs, contadores, uptime) */
font-family: 'IBM Plex Mono', monospace;

/* UI general (labels, nombres, descripciones, botones) */
font-family: 'DM Sans', sans-serif;
```

### Principios de diseño

1. **Dark mode nativo** — sin opción de light mode, siempre oscuro
2. **Densidad controlada** — mucha información, organizada en jerarquías claras
3. **Micro-animaciones funcionales** — solo para comunicar estado (pulso en alerta, spin en refresh)
4. **Glassmorphism sutil** — solo en tooltips y paneles flotantes sobre fondos
5. **Tipografía monoespaciada para datos** — todo número técnico va en IBM Plex Mono
6. **Color como semántica** — cian=acción, verde=OK, naranja=warn, rojo=crítico, siempre
7. **Sin modales innecesarios** — usar paneles deslizables laterales (drawer) en cambio

---

## ESTRUCTURA DE COMPONENTES

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx          ← colapsable, con nav principal
│   │   ├── Topbar.jsx           ← buscador global + alertas + refresh
│   │   └── AlertBanner.jsx      ← banner sticky de alerta crítica activa
│   │
│   ├── dashboard/
│   │   ├── KPICards.jsx         ← 4 métricas: OLTs, ONTs, alertas, LOS
│   │   ├── OLTTable.jsx         ← tabla de OLTs con CPU bar, estado, uptime
│   │   ├── AlertsPanel.jsx      ← lista de alertas activas con iconos y tiempo
│   │   ├── ONTTable.jsx         ← tabla de ONTs con acciones rápidas
│   │   └── FiberTree.jsx        ← árbol GPON visual: OLT → PON → ONT
│   │
│   ├── olts/
│   │   ├── OLTCard.jsx          ← card expandible con detalle de OLT
│   │   ├── OLTForm.jsx          ← formulario alta/edición de OLT
│   │   ├── OLTTerminal.jsx      ← terminal Telnet/SSH en el browser
│   │   └── PortGrid.jsx         ← grilla de puertos PON con colores de estado
│   │
│   ├── onts/
│   │   ├── ONTCard.jsx          ← ficha completa de ONT con acciones
│   │   ├── ONTStatusBadge.jsx   ← badge animado: Online/LOS/Offline/Warning
│   │   └── ONTActions.jsx       ← botones: reboot, ping, ticket, config
│   │
│   ├── signal/
│   │   ├── SignalChart.jsx      ← gráfico de señal óptica (Recharts) 24h/7d
│   │   ├── SignalBar.jsx        ← barra horizontal con color por rango dBm
│   │   └── SignalBadge.jsx      ← badge colorizado con valor dBm
│   │
│   └── shared/
│       ├── DataTable.jsx        ← tabla reutilizable con sort, filter, paginación
│       ├── Drawer.jsx           ← panel lateral deslizante (reemplaza modales)
│       ├── StatusDot.jsx        ← punto de estado animado
│       ├── CopyButton.jsx       ← copiar texto con feedback
│       ├── Tooltip.jsx          ← tooltip rico con datos técnicos
│       └── EmptyState.jsx       ← estado vacío con ícono y mensaje
│
├── pages/
│   ├── Dashboard.jsx            ← vista principal NOC
│   ├── OLTs.jsx                 ← gestión de OLTs
│   ├── ONTs.jsx                 ← listado y búsqueda de ONTs
│   ├── Alerts.jsx               ← historial y alertas activas
│   ├── Clients.jsx              ← gestión de clientes
│   ├── SignalMap.jsx            ← mapa de señal por zona
│   └── Settings.jsx             ← configuración del sistema
```

---

## COMPONENTES DETALLADOS

### `Sidebar.jsx`
- Ancho: 220px expandido / 52px colapsado (toggle con animación CSS)
- Logo "PS" con gradiente cian→azul en 28x28px con texto "Pixel Studios OLT"
- Secciones separadas: MONITOREO / CONFIGURACIÓN / SISTEMA
- Items con ícono Tabler, label y badge de contador (alertas)
- Item activo: borde izquierdo cian + fondo `rgba(0,212,255,0.12)`
- Avatar de usuario en la parte inferior

### `KPICards.jsx`
- Grid de 4 columnas
- Cada card: label monospace 10px + valor 22px bold + subtítulo con color semántico
- Hover: translateY(-1px) + border-color con rgba del color de acento
- Click lleva a la sección correspondiente

### `OLTTable.jsx`
- Columnas: Estado (badge) / Nombre / Marca (badge de color) / Puertos PON / ONTs / CPU (barra) / Uptime
- Filtros por marca: Todas / Huawei / KingType / VSOL
- Barra de CPU: verde < 60%, naranja 60-80%, rojo > 80%
- Fila clickeable → abre Drawer con detalle completo

### `FiberTree.jsx`
- Árbol colapsable: OLT → PON Port → ONTs
- Íconos de color por estado (verde=OK, naranja=warn, rojo=LOS)
- Click en ONT → abre Drawer de detalle del ONT
- Indicador de problemas por PON ("2 LOS", "T-CONT sat")

### `SignalChart.jsx`
- Recharts LineChart responsive
- Línea RX en cian `#00D4FF`, línea TX en verde `#00FF94`
- Área rellena translúcida bajo cada línea
- Zonas de referencia: línea roja discontinua en -27 dBm (LOS), en -8 dBm (alta señal)
- Selector de rango: 24h / 7d / 30d
- Tooltip rico: valor RX, TX, timestamp formateado
- Sin ejes, solo grid horizontal sutil (rgba blanco 0.05)

### `OLTTerminal.jsx`
- Terminal web para enviar comandos Telnet/SSH a la OLT
- Input estilo shell con prompt `olt@HW-OLT-01:~$`
- Output en IBM Plex Mono, scroll automático al final
- Historial de comandos con flecha arriba/abajo
- Botones rápidos: `display ont info all`, `display alarm active`, `display cpu-usage`

### `AlertsPanel.jsx`
- Lista scrollable de alertas activas
- Por alerta: ícono de severidad (🔴/🟠/🔵) + mensaje bold + contexto muted + timestamp relativo
- Hover: fondo rgba blanco 0.02
- Click → reconocer o ver detalle

---

## VISTAS (PÁGINAS)

### `Dashboard.jsx` — Vista principal NOC
```
┌─ Topbar ────────────────────────────────────────────────────┐
│ [Buscador]                    [Estado red] [🔔] [↺] [>_]  │
├─────────────────────────────────────────────────────────────┤
│ [KPI: OLTs] [KPI: ONTs] [KPI: Alertas] [KPI: Alta señal]  │
├──────────────────────────────┬──────────────────────────────┤
│  Tabla OLTs (con tabs marca) │  Panel alertas activas       │
├───────────────────────────┬──┴──────────────────────────────┤
│  Tabla ONTs con problemas  │  Árbol GPON + Stats rápidas   │
└───────────────────────────┴─────────────────────────────────┘
```

### `ONTs.jsx` — Listado completo de ONTs
- Búsqueda instantánea por nombre, MAC, S/N, IP, estado
- Filtros: OLT, Estado, Rango de señal
- Tabla con paginación (50 por página)
- Selección múltiple para reboot masivo
- Export a CSV

### `Clients.jsx` — Gestión de clientes
- Buscador principal (nombre, DNI, contrato, dirección)
- Resultado: card con datos del cliente + estado del ONT en tiempo real
- Click → ficha completa: datos personales, ONT asignada, señal histórica, tickets

---

## WEBSOCKET — Actualizaciones en tiempo real

Implementá un hook `useWebSocket.js` que:
1. Conecta a Socket.io al iniciar la app
2. Escucha eventos y actualiza el store de Zustand
3. Muestra toast notifications con `react-hot-toast` para LOS y alertas críticas
4. Actualiza el contador de alertas en el sidebar sin recargar la página

```js
// Ejemplo de toast para LOS
toast.custom(() => (
  <div className="bg-red-950 border border-red-500/30 rounded-lg p-3 flex gap-3">
    <span className="text-red-400 text-lg">⬤</span>
    <div>
      <p className="font-mono text-sm text-red-300 font-medium">LOS — García, Roberto</p>
      <p className="text-xs text-slate-400">HW-OLT-01 / PON-3 · hace un momento</p>
    </div>
  </div>
), { duration: 8000, position: 'bottom-right' });
```

---

## ANIMACIONES Y MICRO-INTERACCIONES

```css
/* Pulso en alerta crítica activa */
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,92,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(255,59,92,0); }
}

/* Punto de estado online */
@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Spin en botón refresh */
@keyframes spin { to { transform: rotate(360deg); } }

/* Entrada de drawer lateral */
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

Reglas: animaciones solo en elementos que comunican estado. Nada decorativo. Respetar `prefers-reduced-motion`.

---

## RESPONSIVE / MODO CAMPO

Implementá un **Modo Técnico de Campo** para tablets y móviles:
- Activable manualmente o automático en pantallas < 768px
- Vista simplificada: solo buscador de ONT + estado + botones rápidos
- Escanear código QR de caja NAP (Web QR API)
- Sin sidebar, solo barra inferior de navegación
- Optimizado para uso con una mano

---

## ENTREGABLES ESPERADOS

1. Todos los componentes listados, funcionales y conectados a la API
2. Diseño pixel-perfect siguiendo el sistema de diseño definido
3. Conexión WebSocket implementada con actualizaciones en tiempo real
4. Responsive: desktop (dashboard completo) + tablet/móvil (modo campo)
5. Variables de entorno: `VITE_API_URL`, `VITE_WS_URL`
6. `Dockerfile` para el frontend (Nginx sirve el build de Vite)
7. Storybook opcional para componentes del design system

---

## RESTRICCIONES

- Sin librerías de UI externas (no Material UI, no Ant Design, no Chakra) — todo custom con Tailwind
- Todo estilo en Tailwind CSS — mínimo CSS custom, solo para animaciones
- No usar `any` de TypeScript (si se migra eventualmente)
- Los datos técnicos (dBm, MAC, IP, uptime, contadores) siempre en IBM Plex Mono
- Nunca mostrar loading spinners por más de 2 segundos — implementar skeleton loaders
- Los errores de conexión a la API deben mostrarse inline, no en alertas del browser


---

## MÓDULOS DE UI ADICIONALES — PARIDAD SMARTOLT + TR-069

---

### Zero-Touch Provisioning UI

**Componente `PendingONTs.jsx`** — panel de ONTs nuevos detectados pendientes de autorización:
- Badge pulsante en sidebar: "3 ONTs pendientes"
- Lista con: Serial Number, MAC, OLT, Puerto PON, tiempo detectado
- Botón "Autorizar" abre un drawer con:
  - Selector de perfil de aprovisionamiento (dropdown de perfiles guardados)
  - Selector de cliente existente o formulario de nuevo cliente
  - Preview de la configuración que se aplicará (T-CONT, VLAN, velocidad)
  - Botón "Aplicar perfil" con spinner de progreso
- Estado de la provisión en tiempo real vía WebSocket: Pendiente → Configurando → Activo

**Componente `ProfileManager.jsx`** — gestión de perfiles ZTP:
- Tabla de perfiles con: nombre, tipo WAN, VLAN datos/voz/IPTV, velocidad
- Formulario crear/editar perfil con tabs: Datos / VoIP / IPTV / Velocidad
- Botón "Clonar perfil"

---

### Configuración WAN del ONT

**Componente `WANConfig.jsx`** — dentro del Drawer de detalle del ONT:
- Tabs: DHCP / IP Estática / PPPoE
- DHCP: solo botones "Renovar IP" y "Liberar IP"
- IP Estática: campos IP, Máscara, Gateway, DNS1, DNS2
- PPPoE: campos Usuario, Contraseña (con toggle show/hide), VLAN
- Botón "Aplicar" con confirmación: "¿Confirmar cambio de configuración WAN? El cliente perderá conectividad ~10 segundos"
- Indicador de tipo WAN actual con badge colorizado

---

### Mapa GPS de ONTs y Cajas NAP

**Página `MapView.jsx`** — mapa interactivo con Leaflet.js + OpenStreetMap:

```
Layout:
┌─ Topbar ──────────────────────────────────────────┐
├─ Filtros: [Todos] [Online] [LOS] [Alta señal] [NAP]│
├─ Mapa (80% viewport) ─────────────┬─ Panel (20%) ─┤
│  Markers de ONTs colorized        │ Detalle al     │
│  ● verde = online                 │ clickear marker│
│  ● rojo = LOS/offline             │                │
│  ● naranja = warning              │ Nombre cliente │
│  □ azul = caja NAP                │ Señal actual   │
│                                   │ Estado ONT     │
│  Clustering automático            │ Botones acción │
└───────────────────────────────────┴────────────────┘
```

- Markers con clustering (Leaflet.markercluster) para zonas densas
- Click en marker → panel lateral con ficha del ONT/cliente
- Click en caja NAP → lista de puertos con estado (libre/ocupado/falla)
- Botón "Ubicar mi técnico" → geolocalización del browser
- Modo campo: el técnico puede actualizar la ubicación del ONT desde su móvil con el GPS del teléfono
- Heatmap de señal: capa toggleable que coloriza zonas según calidad de señal promedio
- Botón "Agregar caja NAP" → click en el mapa para posicionar

---

### Triple Play — Gestión de servicios

**Componente `ServicesConfig.jsx`** — dentro del Drawer de ONT:

Tres secciones con toggle on/off:

```
┌─ 📡 Datos ──────────────────────────────┐
│ VLAN: [100] Velocidad: [100 ▼] / [20 ▼]│
└─────────────────────────────────────────┘
┌─ 📞 VoIP ───────────────────────────────┐
│ VLAN: [200] SIP: [10.0.0.1]            │
│ Usuario: [1001]  Pass: [●●●●]          │
└─────────────────────────────────────────┘
┌─ 📺 IPTV ───────────────────────────────┐
│ VLAN Datos: [300] VLAN Multicast: [301] │
└─────────────────────────────────────────┘
```

- Toggle para activar/desactivar cada servicio
- Estado actual de cada servicio con badge (Activo / Inactivo / Error)
- Botón "Guardar como perfil" para reusar la configuración

---

### VLAN por Puerto Ethernet

**Componente `EthernetPorts.jsx`** — grilla de puertos físicos del ONT:

```
Puerto ETH1  [PVID: 100] [Modo: Access ▼]  [✏️]
Puerto ETH2  [PVID: 200] [Modo: Trunk  ▼]  [✏️]  [Tagged: 100,300]
Puerto ETH3  [Sin configurar]               [✏️]
Puerto ETH4  [Sin configurar]               [✏️]
```

- Click en ✏️ abre inline editor con selector de modo y VLANs
- Badge de modo con color: verde=Access, azul=Trunk, púrpura=Hybrid
- Advertencia si se cambia el puerto de datos activo del cliente

---

### Speed Limiting UI

**Componente `SpeedControl.jsx`** — dentro del Drawer de ONT:
- Selector de plan comercial (dropdown de perfiles: "50/10", "100/20", "300/50", "Personalizado")
- Si "Personalizado": sliders de Download Mbps y Upload Mbps con valores numéricos
- Velocidad actual mostrada con barra visual (igual que CPU bar)
- Botón "Aplicar" con confirmación
- Historial de cambios de velocidad (últimos 10)

**Componente `SpeedProfiles.jsx`** — en página de Configuración:
- CRUD de planes comerciales con nombre, velocidad down/up, burst permitido
- Botón "Aplicar masivo" → aplica el mismo plan a múltiples ONTs seleccionados

---

### DHCP y tabla MAC

**Componente `DHCPLeases.jsx`** — dentro del Drawer de ONT:
- Tabla: IP asignada, MAC, hostname, tiempo restante del lease
- Botones: "Forzar renovación" y "Liberar IP"
- Indicador de IP actual del cliente en badge cian

**Componente `MACTable.jsx`** — dentro del Drawer de ONT:
- Tabla: Puerto ETH, MAC aprendida, VLAN, timestamp
- Botón "Limpiar tabla MAC" con confirmación
- Auto-refresh cada 30 segundos

---

### Notificaciones Email/SMS

**Página `NotificationSettings.jsx`** — en Configuración:

```
┌─ CANALES DE NOTIFICACIÓN ─────────────────────────┐
│                                                    │
│  📧 Email                              [+ Agregar] │
│  noc@isp.com    [LOS, CPU_HIGH]        [✏️] [🗑️] │
│  admin@isp.com  [OLT_UNREACHABLE]      [✏️] [🗑️] │
│                                                    │
│  📱 SMS                                [+ Agregar] │
│  +549XXXXXXXX   [LOS, DYING_GASP]      [✏️] [🗑️] │
│                                                    │
│  [Enviar notificación de prueba ↗]                │
└────────────────────────────────────────────────────┘
```

- Formulario de agregar canal: tipo, destino, eventos a notificar (multi-select), horario
- Toggle "Solo en horario laboral" con selector de días y horas
- Badge de último envío exitoso: "hace 2h" o "Error · hace 5min"

---

### Panel TR-069 / ACS

**Página `TR069.jsx`** — sección propia en el sidebar:

```
┌─ Topbar ─────────────────────────────────────────────────┐
├─ [KPI: CPEs registrados] [KPI: Online] [KPI: Con tareas] ┤
├─ Tabla de dispositivos TR-069 ───────────────────────────┤
│ S/N · Marca · Modelo · SW Version · Último INFORM · IP  │
│ [Detalle] [Parámetros] [Reboot] [Firmware] [Tareas]     │
└──────────────────────────────────────────────────────────┘
```

**Componente `TR069DeviceDrawer.jsx`** — panel lateral del CPE:

Tabs:
1. **Info** — fabricante, modelo, versión SW/HW, IP, último INFORM, uptime
2. **Parámetros** — árbol de parámetros TR-069 editable (estilo explorador de archivos)
   - Búsqueda de parámetro por nombre
   - Click en valor → input inline para editar
   - Botón "Aplicar cambios" → encola `SetParameterValues`
3. **WiFi** — configuración WiFi del CPE (SSID, contraseña, canal, modo) con formulario simple
4. **Diagnósticos** — ping test / traceroute / conexión test desde el CPE, resultado en terminal
5. **Firmware** — versión actual, historial de actualizaciones, botón "Push firmware" con selector de archivo
6. **Tareas** — cola de tareas pendientes/ejecutadas con estado: Pendiente / En ejecución / OK / Error

**Componente `FirmwarePush.jsx`**:
- Selector de CPEs (multi-select con filtro por modelo/fabricante)
- Upload del archivo de firmware o URL de descarga
- Programar horario del push (para hacer en madrugada)
- Barra de progreso por dispositivo con estado en tiempo real vía WebSocket

**Componente `TR069Stats.jsx`** — en Dashboard principal:
- KPI pequeño: "CPEs TR-069: 142 online / 8 offline"
- Mini-tabla de últimos INFORMs con alerta si algún CPE no reporta hace más de 2× su intervalo

