# RELEVAMIENTO COMPLETO — SmartOLT v3.53.0

> **URL:** https://itelsa.smartolt.com/
> **Fecha:** 09/06/2026
> **Hardware real:** 6 x Huawei MA5800-X15 | **Total ONUs:** ~13,523 (12,413 online)
> **Stack:** CodeIgniter PHP + MySQL + Bootstrap 3 + jQuery + Chart.js

---

## ÍNDICE DE PÁGINAS Y FUNCIONALIDAD

Cada sección documenta: botones, campos, tablas, modales, y acciones disponibles.

---

## 1. LOGIN `/auth/login`

### Formulario
| Campo | Tipo | ID | Value |
|-------|------|----|-------|
| referrer | hidden | — | — |
| identity | text | `#identity` | — |
| password | password | `#password` | — |
| remember | checkbox | `#remember` | 1 |
| submit | submit (btn btn-lg btn-success btn-block) | — | "Iniciar sesión" |

### Mecanismo
- POST a `https://itelsa.smartolt.com/auth/login`
- Sesión manejada por `ci_session` (cookie de CodeIgniter)
- Sin 2FA detectado (pero hay campo de 2FA en user-edit)

---

## 2. DASHBOARD `/`

### Stat Boxes (KPIs) — 4 tarjetas cliqueables
1. **Waiting authorization** (fondo azul, icono wand) → `/onu/unconfigured` — **9**
   - Desglose: D: 0 Resync: 0 New: 9
2. **Online** (fondo verde, icono check) → `/onu/configured` — **12,413**
   - Total authorized: 13,523
3. **Total offline** (fondo rojo/gris, icono X) → filtrado — **1,111**
   - PwrFail: 239 | LoS: 15 | N/A: 857
4. **Low signals** (fondo naranja, icono exclamación) → `/diagnostics?signal=warning,critical` — **233**
   - Warning: 211 | Critical: 22

### Gráficos (Chart.js)
- **Selector temporal:** Hourly | Daily | Weekly | Monthly | Yearly
- **Network status area chart:** ONU status over time
- **ONU authorizations per day:** Bar chart
- **Selector OLT:** All | 4-Itelsa-Huawei (9410) | 5-Itelsa-SantaAna (459) | 6-Itelsa-Feliciano (1813) | 7-Itelsa-Federal (1138) | 8-Itelsa-Mocoreta (645) | 9-Itelsa-Huawei2 (59)
- **Custom color picker:** 16 colores predefinidos + personalizado (Hex/RGB/HSL)

### Tabla: Degradación de señal (Signal variation)
- Columnas: Severity | OLT name | Board/Port | Avg delta (dB) | Max delta (dB) | Degraded | Events | Last scan
- Por cada PON: tabla anidada de ONUs con Previous (dBm) | Current (dBm) | Delta (dB) | Events

### Tabla: PON Outage (stale/decommissioned)
- Columnas: OLT | PONs | ONUs | Since
- Datos: 3 PONs fuera por mas de 3 meses a 1 año

### Panel derecho: Info feed (actividad reciente)
- "View All Info" button → `/info`

### Modales
1. **Signal variation alert settings** (Cancel | Save)
   - Signal variation threshold (dB) — input number
   - Large signal variation threshold (dB) — input number
   - ONUs required for Unstable — input number
   - Repeated variation window (hours) — input number
   - Variations required for Critical — input number
2. **Save configuration** (No, cancel | Yes, save configuration) — aparece en TODAS las páginas

### Dropdowns de navegación
- Reports: Authorizations | Export | Import | Find config mismatches (DB vs OLT)
- Admin: Zones | ODBs | ONU types | Speed profiles | OLTs | VPN & TR069 | Authorization presets | General | Billing

---

## 3. UNCONFIGURED ONUs `/onu/unconfigured`

### Filtros
- OLT (multi-select): 4-Itelsa-Huawei ~ 9-Itelsa-Huawei2

### Botones de acción
1. **Refresh** — recargar ONUs sin configurar
2. **Configure actions** — abre modal de auto-actions
3. **Task history** — → `/reports/tasks`
4. **Stop auto actions** — detener tarea automática
5. **Authorization Presets** — → `/onu_authorization_presets/listing`
6. **Add ONU for later authorization** — agrega a Saved ONUs

### Tablas por OLT
- Columnas: PON type | Board | Port | PON description | SN | Type | Action
- Acción: link "Authorize" → `/onu_authorization/authorize?board=X&port=Y&sn=SN&pon=gpon&onu_type=N&olt=ID`

### Saved ONUs (tabla inferior)
- Columnas: Name | SN | OLT | View

### Modales
1. **Finalize authorization** (Close | Authorize)
2. **Move ONU** (Close | Move)
3. **Recreate OLT config for ONU** (Close | Resync config)
4. **Auto actions** (sin contenido visible)
5. **Authorize ONU with Preset** (Cancel | Authorize with Preset) — campo: ONU name
6. **Save config** (global)

---

## 4. CONFIGURED ONUs `/onu/configured` — LA VISTA MAESTRA (~24 filtros)

### Barra de filtros masiva
- **Search** (texto libre — SN, IP, name, address, phone, PPPoE user)
- **Multi-selects:** OLT, Board, Port, Zone, ODB, VLAN, ONU type, Profile, PON type, Mgmt IP, TR-069, VoIP, CATV, Download, Upload, SVLAN, CVLAN, Tag-transform
- **Single-selects:** WAN mode (Setup via ONU webpage/DHCP/Static/PPPoE), Configuration method (OMCI/TR069), WAN IP protocol (IPv4/IPv4+IPv6), Resync failed (Yes/No)
- **Date picker:** Status changed before
- **Status filter:** Online | Power Fail | LOS | Offline | Disabled (iconos)
- **Signal filter:** Good | Warning | Critical (iconos)
- **Mode filter:** Bridging | Routing

### Batch actions panel (colapsable)
- Active batch tasks display
- **Acciones batch:**
  - Change main VLAN (multi-select)
  - SVLAN/CVLAN + Tag-transform mode
  - Change ONU type
  - Custom profile
  - Set Mgmt IP (Inactive/Static/DHCP)
  - TR-069 (Disable/Enable)
  - WAN config (OMCI/TR069, WAN mode, IP pool)
  - IPv6 (Enable/Disable, address mode, prefix delegation)
  - Web user/pass
  - Move zone
  - DNS / DHCP Option 82 / PPPoE Plus
  - **Export/Import CSV**

### DataTable (server-side paginated)
- Columnas: Status | View | Name | SN/MAC | ONU | Zone | ODB | Signal | B/R | VLAN | VoIP | TV | Type | Auth date
- Acción: "View" → `/onu/view/<id>` (gestión individual de ONU)

### Modales
1. Permission Required
2. Import ONUs location details
3. Save configuration

---

## 5. ONU MANAGEMENT `/onu/view/<id>` — 33 ACCIONES

### Panel izquierdo — Datos fijos
| Dato | Ejemplo |
|------|---------|
| OLT | 4 - Itelsa-Huawei |
| Board | 0/17 |
| Port | 15 |
| ONU ID | 22 |
| ONU type | HG8245H |
| GPON channel | 0 |
| External ID | (texto) |
| Name | (cliente) |
| Zone | (zona) |
| ODB | (splitter) |
| Address | (dirección) |
| Contact | (contacto) |
| Coordinates | lat/lng |
| Auth date | fecha |
| Authorized by | usuario |

### Panel derecho — Status
- Online/Offline
- Uptime
- RX power, TX power
- OLT Rx signal
- VLANs
- Mgmt IP
- MAC
- Distance
- WAN setup mode
- PPPoE username
- Firmware/SW version
- Serial

### Gráficos (dentro de tabs)
- **Traffic chart** (up/down) — 24h + LIVE mode + More graphs modal
- **Signal chart** (1310/1490 nm) — 24h + LIVE mode + More graphs modal

### Quick Actions Footer
| Botón | Color | Acción |
|-------|-------|--------|
| Get status | verde | obtiene estado actual |
| Show running-config | verde | muestra config running |
| SW info | verde | info firmware |
| TR069 Stat | verde | status TR-069 |
| Reboot | naranja | confirma y ejecuta |
| Resync config | amarillo | recrea config OLT |
| Restore defaults | amarillo | factory reset |
| Disable ONU | amarillo | deshabilita |
| Delete | rojo | elimina ONU |
| LIVE! | verde | gráficos en vivo |

### 33 Acciones (secciones con modal cada una)

#### 1. View ONU (pestaña activa por defecto)
#### 2. Change ONU type
- SELECT onu_type_id + custom_template_id (Generic_1..6)
- Botones: Close | Change

#### 3. Update ONU external ID
- INPUT client_external_id
- Botones: Close | Update

#### 4. Configure speed profiles
- Service-port info: ID | SVLAN | User-VLAN | Download | Upload | Action(Configure)
- SVLAN (checkbox + select) | User VLAN (checkbox + select) | Tag-transform mode
- Download speed (select con search): 128Kb, 5M, 10M, 20M, 25M, 15M, 30M, 40M, 50M, 60M, 70M, 80M, 90M, 100M, 120M, 150M, 200M, 250M, 300M, 400M, 500M, 1G
- Upload speed (select con search): 128Kb, 1M, 2M, 5M, 10M, 25M, 15M, 15MB, 30M, 40M, 20M, 50M, 60M, 70M, 80M, 90M, 100M, 120M, 150M, 200M, 250M, 300M, 400M, 500M, 1G
- Botones: Remove service port | Close | Save

#### 5. Configure ethernet port (por cada puerto: eth_0/1..4)
- Tabla: Port | Admin state | Mode | DHCP | Action(Configure)
- Modal: is_enabled (radio) | port_mode (LAN/WAN/Hybrid/GPON/EPON) | VLAN-ID | Allowed VLANs list
- Botones: Close | Save

#### 6. Configure WiFi port (por cada SSID: wifi_0/1, wifi_0/5)
- Tabla: Port | Admin state | Mode | SSID | DHCP | Action(Configure)
- Modal: is_enabled | port_mode | VLAN-ID | Allowed VLANs | SSID | Auth mode (WPA2/Open-system) | WiFi password
- Botones: Clear WiFi port settings | Close | Save

#### 7. Change web user pass
- INPUT web_user + web_password
- Botones: Close | Change

#### 8. Delete (modal confirmación)
- Botones: Close | Delete (`/onu/delete/ID`)

#### 9. Reboot (modal confirmación)
- Botones: Close | Reboot (`/onu/reboot/ID`)

#### 10. Disable ONU
- Botones: Close | Disable (`/onu/disable/ID`)

#### 11. Enable ONU
- Botones: Close | Enable (`/onu/enable/ID`)

#### 12. Stop ONU
- Botones: Close | Stop (`/onu/stop/ID`)

#### 13. Start ONU
- Botones: Close | Start (`/onu/start/ID`)

#### 14. Recreate OLT config (Resync)
- Botones: Close | Resync config (`/onu/rebuild/ID`)

#### 15. Restore to factory defaults
- Botones: Close | Restore (`/onu/restore_factory_defaults/ID`)

#### 16. Firmware Upgrade - Reset to defaults
- Botones: Close | Firmware upgrade (`/onu/firmware_upgrade/ID`)

#### 17. Update ONU mode
- WAN VLAN-ID | mode (Bridge/Router) | router_mode (DHCP/Static/PPPoE/PPPoE+DHCP)
- configuration_method (OMCI/TR069) | ipProtocol (IPv4/IPv4+IPv6)
- wan_ip_source (DHCP/Static) | WAN IP address (pool)
- Campos IPv4: IP, subnet, gateway, DNS1, DNS2
- IPv6: addressMode (SLAAC/DHCP/Static/Disabled), IPv6 address, gateway, PdMode (Enabled/Disabled/Static), prefix
- PPPoE: username, password
- WAN remote access (Disabled / Enabled from IPs in ACL / Enabled from everywhere)
- Botones: Close | Update

#### 18. Update Management and VoIP IP
- TR069 Profile (Disabled/SmartOLT)
- mgmt_ip_mode (Inactive/Static/DHCP)
- allow_remote_access (checkbox)
- use_mgmt_ip_svlan (checkbox)
- Mgmt SVLAN-ID / VLAN-ID / Tag-transform mode
- Mgmt IP address, subnet, gateway, DNS1, DNS2
- voip_mode (Mgmt IP / Separate VLAN) | voip_attach_to (Untagged / Tagged)
- Botones: Close | Update

#### 19. TR069 Profile
- Igual que el selector de TR-069 dentro de Mgmt IP

#### 20. Mgmt IP
- Igual que los campos de mgmt ip arriba

#### 21. VoIP service
- Port | SIP profile | Phone number | Password
- Botones: Clear config | Close | Enable

#### 22. Move ONU
- SELECT: OLT | Board | Port | move_to_default_vlan (checkbox)
- Botones: Close | Move

#### 23. Change allocated ONU ID
- SELECT target_onu_id
- Botones: Close | Apply

#### 24. Update GPON channel
- Radio: gpon_type (opciones) + detected_max_onu_id_override_mode
- Botones: Close | Update

#### 25. Update EPON channel
- Radio: epon_type
- Botones: Close | Update

#### 26. Replace ONU by SN
- INPUT sn | SELECT found SNs | SELECT new onu type
- Botones: Close | Replace

#### 27. Update attached VLANs
- SELECT-MULTIPLE extra_vlans[]
- Botones: Close | Update

#### 28. Update location details
- Zone | ODB (Splitter) | ODB port | Name | Address or comment | Contact
- Latitude | Longitude + Map button + Get current location + Open in Maps
- Botones: Close | Update

#### 29. Enable VoIP
- Port | SIP profile | Phone number | Password
- Botones: Clear config | Close | Enable

#### 30. Disable VoIP
- Botones: Close | Disable

#### 31. Update IPTV
- iptv (radio: Disabled/Enabled) | use_iptv_svlan (checkbox)
- IPTV SVLAN ID | Tag-transform mode | IPTV VLAN ID
- Download speed (50M/10M/300) | Upload speed (10M)
- Botones: Close | Update

#### 32. History
- Log de cambios (no modal, sección expandible)

#### 33. Save configuration (modal global)

### Modales adicionales en ONU view (los modales de confirmación para cada acción)
- rebootModal, deleteModal, disableModal, enableModal, stopModal, startModal, rebuildModal, restoreFDModal, firmwareUpgradeModal

---

## 6. GRAPHS `/graphs`

### Controles
- OLT selector: Any / 6 OLTs
- "Graph for" dropdown: OLT / Uplink / PON / Traffic / Signal

### Grilla 2-columnas de gráficos por OLT
- Daily OLT environment temperature
- MA5800 card daily CPU usage
- Current / Average / Maximum labels
- Paginación (1,2,3,4,5...)

### Modal `graphsModal` para vista expandida

---

## 7. DIAGNOSTICS `/diagnostics`

### Tabla de señales ópticas (TODAS las ONUs)
- Filtro: Status (Any)
- Columnas: Status | Rx OLT | Rx ONU | Distance | Name | SN/MAC | Zone | ODB | ONU | Status changed
- Colores: RX verde / amarillo / rojo según nivel
- Botones: Refresh + Export

---

## 8. REPORTS

### 8.1 Tasks `/reports/tasks`
- Filtros: OLT | User | Action | From | To
- Tabla: Action | OLT | ONUs | User | Status | Period | Stopped by
- Modal: Restart Auto-Authorize Task

### 8.2 Authorizations `/reports/authorizations/list`
- Tab: Authorizations
- Tabla: User | SN/MAC | Name | PON | Date
- Export button

### 8.3 Export `/reports/export`
- ~85 campos seleccionables para exportar
- Filtros: OLT | Board | Port | Zone
- Tabla de exports previos: Created | Filters | Status | ONUs | Actions

### 8.4 Import `/reports/import`
- CSV file upload para operaciones bulk

---

## 9. CONFIG MISMATCHES `/config_comparison`

- Select OLTs (multi), Scan & Compare, Save
- Detecta admin-state y CATV mismatches

---

## 10. ZONES `/locations/listing`

- 71 zonas
- Add Zone | Delete unused zones | Export | Import (CSV)
- Tabla: Name | ONUs | Action (Edit/Delete)

---

## 11. ODBs/Splitters `/odbs/listing`

- 100+ ODBs
- Filtros: Usage (Any/>=50%/>=75%/>=90%/Capacity exceeded) | Coordinates (Any/Yes/No)
- Tabla: ODB name | Coordinates | ONUs | Ports | Usage | Zone | Action
- Import ODBs | Delete unused ODBs

---

## 12. ONU TYPES `/onu_types/listing`

- 70 modelos de ONU
- Tabla: PON type | Channels | ONU type | Ethernet ports | WiFi | VoIP ports | CATV | Custom profiles | Capability | Action
- Modelos: Huawei, VSOL, KT, Intelbras, FiberHome, etc.

### Lista completa de ONU types detectados:
1126, AG1720, AG1729, AG1745, BM242GFAC4T, BM321GF, BM341GAC2, BM341GWT, BM342GAC4T, DN-HG8431C, EG8021V5, EG8041V5, EG8041X6-10, EG8141A5, EG8145V5, EG8145X6-10, EG8147X6-10, EG8247W5, F601V6.0, GP1704-1G, GP1704-2FC-S, GP1704-4GV-22A, GP1704-4GVC-22A, GP1705-2GV, GP1705-4GVR, HG8010H, HG8120C, HG8240, HG8240H, HG8240T, HG8242, HG8242H, HG8245H, HG8247H5, HG8310M, HG8311, HG8321R, HG8321V, HG8326R, HG8340M, HG8346M, HG8346R, HG8347R, HG8545M, HG8546M, HG8546M-RMS, HG865, HL-4GMV2, HS8145C, HS8145V, HS8145X6, HS8545M5, HS8546M, HS8546V, HWTC, IC410WSG, IC435ETR, IC445ETRF, IC455WDB, IC485WRF, KT-AZUL, ONU-type-eth-4-pots-2-catv-0, SF8143A5, SF8143A5S, STD-HGU, TGS10G0W0T-ZISA, Vector5, VSOL, WH85460HG

---

## 13. SPEED PROFILES `/speed_profiles`

- **Tabs:** Download | Upload
- **27 perfiles Download:** 128Kb, 5M, 10M, 20M, 25M, 15M, 30M, 40M, 50M, 60M, 70M, 80M, 90M, 100M, 120M, 150M, 200M, 250M, 300M, 400M, 500M, 1G, etc.
- **28 perfiles Upload:** 128Kb, 1M, 2M, 5M, 10M, 25M, 15M, 15MB, 30M, 40M, 20M, 50M, 60M, 70M, 80M, 90M, 100M, 120M, 150M, 200M, 250M, 300M, 400M, 500M, 1G
- Columnas: Name | For | Use prefix&suffix | Speed | Type | Default | ONUs | Action

---

## 14. OLTS `/olt`

- Tabla: View | ID | Status | Name | OLT IP | TCP | UDP | Hardware version | SW version | Action

### OLTs reales:
| ID | Name | IP | TCP | UDP | HW | SW |
|----|------|----|-----|-----|----|-----|
| 4 | Itelsa-Huawei | 66.128.38.204 | 2333 | 2361 | MA5800-X15 | R018 |
| 5 | Itelsa-SantaAna | 66.128.38.203 | 2333 | 2161 | MA5800-X15 | R018 |
| 6 | Itelsa-Feliciano | 66.128.45.98 | 2333 | 2361 | MA5800-X15 | R018 |
| 7 | Itelsa-Federal | 66.128.40.200 | 2333 | 2161 | MA5800-X15 | R019 |
| 8 | Itelsa-Mocoreta | 66.128.45.80 | 2333 | 2361 | MA5800-X15 | R018 |
| 9 | Itelsa-Huawei2 | 66.128.38.205 | 2333 | 2461 | MA5800-X15 | R018 |

### Add OLT `/olt/add` — 15 campos
- Name, OLT IP/FQDN, Telnet TCP port (default: 2333), telnet username, telnet password
- SNMP readonly community (default generado), SNMP readwrite community (default generado), SNMP UDP port (default: 2161)
- IPTV module (checkbox)
- OLT manufacturer: Huawei/ZTE
- HW version: 12 modelos Huawei (EA5800-X15, X17, X2, X7, GP08, etc.)
- SW version: R008 a R019
- PON types: GPON | EPON | GPON+EPON

### Edit OLT `/olt/edit/<id>` — mismos campos + Latitude/Longitude

### Credenciales SNMP detectadas:
| OLT | RO Community | RW Community |
|-----|-------------|-------------|
| 4 | H7NdCzU6vyeQ1* | vu4XKL5TnpDM1* |
| 5 | X1N372024 | I7e1s42024 |
| 6 | H7NdCzU6vyeQ | vu4XKL5TnpDM |
| 7 | Kly2GE3cwZbP | xDnMfWbUKG6l |
| 8 | H7NdCzU6vyeQ | vu4XKL5TnpDM |
| 9 | 6lyzUkdt0vL: | HxDvy2phk0b. |

---

## 15. VPN & TR069 `/system_config`

### Tabs
1. **VPN tunnels** — Tabla: # | User/tunnel name | Status | Subnet | Connected subnets | Actions
2. **TR069 Profiles** — Tabla: Profile name | CWMP ACS | Status | OLTs | Action

### Modal: Create/Edit tunnel
- OLT selector (multi) | Profile name | ACS URL | etc.

---

## 16. AUTHORIZATION PRESETS `/onu_authorization_presets/listing`

### Wizard multi-paso
- Nombre, descripción, OLT, board, port, PON type, SN pattern
- ONU type (de la lista de 70+), fallback, default, mode
- VLANs, perfiles de velocidad, zona, ODB
- Botones: Previous | Next | Create Preset | Cancel

---

## 17. SETTINGS `/general` (5 tabs)

### Tab General
- Title: SMARTOLT
- Timezone: America/Argentina/San_Juan
- IP access allowed
- Installer time limit (3 days)
- Language: Espanol

### Tab Users
- Tabla: Name | Email | 2F Auth | Group | Status

### Tab API Key
- Generación/regeneración de API key
- Tabla: # | Api key type | Restriction group | Allowed IPs | Actions

### Tab API Logs
- Tabla: Method name | Max calls per hour

### Tab Billing
- Tabla: OLT ID | OLT name | Subscription status | Subscription end date (inclusive)

---

## 18. NAVEGACIÓN GLOBAL

### Sidebar / Top menu
```
SMARTOLT (logo/home)
├── Unconfigured (/onu/unconfigured)
├── Configured (/onu/configured)
├── Graphs (/graphs)
├── Diagnostics (/diagnostics)
├── Reports
│   ├── Tasks (/reports/tasks)
│   ├── Authorizations (/reports/authorizations/list)
│   ├── Export (/reports/export)
│   └── Import (/reports/import)
├── Config mismatches (/config_comparison)
├── Locations
│   ├── Zones (/locations/listing)
│   └── ODBs (/odbs/listing)
├── ONU types (/onu_types/listing)
├── Speed profiles (/speed_profiles)
├── OLTs (/olt)
├── VPN & TR069 (/system_config)
├── Authorization presets (/onu_authorization_presets/listing)
└── Settings
    ├── General (/general)
    ├── Billing (/general/listing/billing)
    └── Edit user (/auth)
```

### Footer / Cross-cutting
- **Save configuration modal** presente en TODAS las páginas
- Botón "Yes, save configuration" / "No, cancel"
- Versión: v3.53.0
- Update banner con dismiss

---

# COMPARATIVA: SmartOLT vs Pixel-Studio-OLT

## LO QUE PIXEL-STUDIO-OLT YA TIENE (BIEN IMPLEMENTADO)

### Backend
- ✅ Express + Prisma + Socket.io + Redis + Bull queues
- ✅ Adaptadores Huawei MA5800 (SNMP + Telnet)
- ✅ Adaptador KingType C300 (SNMP)
- ✅ Adaptador VSOL (Telnet)
- ✅ TR-069 ACS server (CWMP SOAP)
- ✅ ZTP engine
- ✅ Notificaciones email + SMS
- ✅ 3 Bull queues: pollOLTs (60s), signalHistory (5min), alertEngine (15s)
- ✅ JWT + RBAC + AES-256-GCM
- ✅ Prisma schema con 14 modelos
- ✅ Seed script con datos demo

### Frontend
- ✅ React 18 + Vite + Tailwind + Zustand + TanStack Query + Recharts + Leaflet
- ✅ Dashboard con KPIs, SignalChart, FiberTree
- ✅ Sidebar/Topbar/Drawer/DataTable components
- ✅ Páginas: Dashboard, OLTs, ONTs, Clients, Map, TR-069, ZTP, Alerts, Events, PON Ports, Signal, Speed Profiles, Reports, Settings, Users, Login
- ✅ Stores: authStore, uiStore, oltStore, ontStore, alertStore
- ✅ Hooks: useOLTs, useONTs, useAlerts, useSignal, useWebSocket

---

## LO QUE FALTA PIXEL-STUDIO-OLT (POR PRIORIDAD)

### 🔴 PRIORIDAD CRÍTICA — Funcionalidad faltante completa

#### 1. Auto-actions / Tareas automáticas (ONU provisioning)
**SmartOLT:** `/onu/unconfigured` tiene botones "Configure actions", "Stop auto actions", "Task history", y ONUs detectadas automáticamente con botón "Authorize" por cada una.
**Pixel:** No tiene el sistema de auto-actions, cola de autorización, ni la lógica de "Configure actions" que autoriza ONUs automáticamente según patrones/carrier.

**Cómo hacerlo:**
- Crear tabla `AutoActionPreset` en Prisma: `{ id, name, olts, boards, ports, ponType, snPattern, onuTypeId, fallbackOnuTypeId, isDefault, mode, svlanId, cvlanId, tagTransform, downloadSpeed, uploadSpeed, zoneId, odbId, webUser, webPassword, description, isActive, createdAt, updatedAt }`
- Crear Bull queue `autoAuthorize` que cada N segundos revisa ONUs detectadas vs presets y autoriza automáticamente
- UI: página `/onu/unconfigured` con tabla de ONUs detectadas + panel de auto-actions + CRUD de presets

#### 2. ONU Management — Vista individual con 33 acciones
**SmartOLT:** `/onu/view/<id>` con 33 acciones en tabs + modales.
**Pixel:** Tiene página ONTs genérica pero NO tiene la vista de gestión individual de ONU con todas las acciones.

**Cómo hacerlo:**
- Crear ruta `/onts/:id` con layout de 2 paneles (datos fijos izquierda / status derecha)
- Implementar cada una de las 33 secciones como componentes colapsables o tabs:
  - `OntViewPanel`, `OntChangeType`, `OntExternalId`, `OntSpeedProfiles`, `OntEthernetPort`, `OntWiFiPort`, `OntWebUserPass`, `OntDelete`, `OntReboot`, `OntDisable`, `OntEnable`, `OntStop`, `OntStart`, `OntResync`, `OntRestoreDefaults`, `OntFirmwareUpgrade`, `OntModeUpdate`, `OntMgmtIP`, `OntTr069Profile`, `OntVoIPService`, `OntMove`, `OntReallocateId`, `OntGponChannel`, `OntEponChannel`, `OntReplaceSN`, `OntVLANs`, `OntLocation`, `OntVoIPEnable`, `OntVoIPDisable`, `OntIPTV`, `OntHistory`
- Cada una con su modal de confirmación
- Quick actions footer: Reboot (naranja), Resync (amarillo), Restore defaults (amarillo), Delete (rojo)
- Live charts: Signal + Traffic con toggle 24h/LIVE

#### 3. Authorize ONU flow completo
**SmartOLT:** Formulario `/onu_authorization/authorize` con 311 campos (OLT, PON type, Board, Port, SN, ONU type, VLANs, speed profiles, zona, ODB, ubicación, etc.)
**Pixel:** No existe flujo de autorización de ONU.

**Cómo hacerlo:**
- Crear página/vista `/onu/authorize` con wizard multi-paso:
  1. Detección: OLT, Board, Port, SN, PON type (auto-detectados)
  2. Configuración: ONU type, VLANs (SVLAN/CVLAN/User-VLAN), Tag-transform
  3. Speed profiles (Download/Upload con search)
  4. Ubicación: Zone, ODB, ODB port
  5. Confirmación: nombre, dirección, coordenadas (+ mapa Leaflet)
- Backend: endpoint `POST /api/v1/onts/authorize` que ejecuta los comandos via Telnet/SSH

#### 4. Authorization Presets (wizard multi-paso)
**SmartOLT:** `/onu_authorization_presets/listing` con wizard de creación de presets.
**Pixel:** No existe.

**Cómo hacerlo:**
- Tabla `AuthorizationPreset` en Prisma
- UI: Wizard con pasos Previous/Next: nombre → OLT/board/port → SN pattern → ONU type → VLANs → speed profiles → zona/ODB
- Al detectar ONU nueva, comparar contra presets y autorizar automáticamente

#### 5. Config Mismatches (DB vs OLT)
**SmartOLT:** `/config_comparison` — compara DB vs OLT real y detecta discrepancias.
**Pixel:** No existe.

**Cómo hacerlo:**
- Endpoint `GET /api/v1/olts/:id/compare` que ejecuta Telnet `display current-configuration` y compara con DB
- UI: tabla de discrepancias con botones "Fix mismatch" por cada una
- Auto-corrección de admin-state y CATV

#### 6. Batch Operations sobre ONUs
**SmartOLT:** Panel colapsable en `/onu/configured` con acciones batch masivas.
**Pixel:** No existe.

**Cómo hacerlo:**
- Panel en página ONTs: seleccionar ONUs → elegir acción batch:
  - Change main VLAN, SVLAN/CVLAN, Tag-transform
  - Change ONU type, Custom profile
  - Set Mgmt IP (Inactive/Static/DHCP)
  - TR-069 (Disable/Enable)
  - WAN config, IPv6
  - Web user/pass, Move zone, DNS, DHCP Option 82, PPPoE Plus
- Backend: Bull queue `batchOperation` que procesa en lote
- Export/Import CSV de ONUs con ~85 campos

#### 7. Reports completos (Tasks, Authorizations, Export, Import)
**SmartOLT:** 4 vistas de reports.
**Pixel:** Tiene página Reports genérica pero sin las 4 sub-vistas.

**Cómo hacerlo:**
- Tasks: historial de colas de tareas/acciones sobre OLTs. Filtros: OLT, User, Action, Fecha
- Authorizations: log de auditoría de autorizaciones. Export button
- Export: selector de ~85 campos, filtros OLT/Board/Port/Zone, tabla de exports previos
- Import: subida de CSV para operaciones bulk

---

### 🟡 PRIORIDAD ALTA — Funcionalidad parcial o con diferencias

#### 8. Dashboard — Signal degradation table + PON outage
**SmartOLT:** Tabla de degradación de señal por PON + tabla de PONs caídas.
**Pixel:** Dashboard tiene KPIs y gráficos pero no estas tablas específicas.

**Cómo hacerlo:**
- Componente `SignalDegradationTable` con columnas Severity | OLT | Board/Port | Avg/Max delta | Degraded | Events | Last scan
- Componente `PonOutageTable` con columnas OLT | PONs | ONUs | Since
- Datos desde SNMP polling o desde tabla de signal_history en DB

#### 9. Diagnostics page
**SmartOLT:** Tabla de señales ópticas de TODAS las ONUs con filtros y color-coding.
**Pixel:** Tiene página Signal pero no es exactamente el mismo layout.

**Cómo hacerlo:**
- Tabla server-side paginated: Status | Rx OLT (color-coded) | Rx ONU | Distance | Name | SN/MAC | Zone | ODB | ONU | Status changed
- Filtros por status, OLT, board, port
- Color coding: verde (< -27dBm), amarillo (-27 a -30dBm), rojo (> -30dBm)
- Refresh + Export CSV

#### 10. Speed Profiles — tabs Download/Upload con datos reales
**SmartOLT:** 55 perfiles (27 download + 28 upload) con datos reales de speed, type, ONUs count.
**Pixel:** Tiene página Speed Profiles pero usa datos demo.

**Cómo hacerlo:**
- Tabla `SpeedProfile` con campos: name, direction (DOWNLOAD/UPLOAD), speedKbps, type (INTERNET/IPTV/MGMT), isDefault, forPonType
- Seed con los 55 perfiles reales de SmartOLT
- Tab en UI: Download | Upload

#### 11. ONU Types — 70 modelos con capability mapping
**SmartOLT:** 70 modelos de ONU con capacidades (Ethernet/WiFi/VoIP/CATV).
**Pixel:** Tiene concepto de ONU types pero no con esta riqueza de modelos.

**Cómo hacerlo:**
- Tabla `OnuType` con campos: name, ponType, channels, ethernetPorts, wifiBands, voipPorts, hasCATV, allowCustomProfiles, capability
- Seed con los 70 modelos reales de SmartOLT (Huawei, VSOL, KT, FiberHome, etc.)

#### 12. VPN & TR-069 management
**SmartOLT:** 2 tabs: VPN tunnels + TR069 Profiles con tabla de estado.
**Pixel:** Tiene TR-069 ACS server pero no página de gestión de túneles VPN ni perfiles TR-069.

**Cómo hacerlo:**
- Tabla/CRUD de perfiles TR-069: Profile name, CWMP ACS URL, Status, OLTs asignadas
- Tabla de VPN tunnels (Mikrotik): User/tunnel name, Status, Subnet, Connected subnets

#### 13. Zones + ODBs CRUD completo
**SmartOLT:** 71 zonas y 100+ ODBs con export/import CSV.
**Pixel:** Tiene modelos de Zone y ODB pero no página de gestión con import/export.

**Cómo hacerlo:**
- Página Zones con Add/Edit/Delete, export CSV, import CSV, "Delete unused zones"
- Página ODBs con filtros de capacidad, add/edit/delete, import CSV
- Mapa de ubicación de ODBs

#### 14. Config comparison page
**SmartOLT:** `/config_comparison` con scan & compare + save.
**Pixel:** No existe.

**Cómo hacerlo:**
- Selector de OLTs (multi) + "Scan & Compare" button
- Endpoint que ejecuta `display current-configuration` via Telnet y compara con DB
- Tabla de discrepancias: admin-state mismatches, CATV mismatches
- Botón "Save to DB" o "Push to OLT"

---

### 🟢 PRIORIDAD MEDIA — Mejoras y pulido

#### 15. Save configuration modal en todas las páginas
**SmartOLT:** Modal global "Yes, save configuration" / "No, cancel" en TODAS las páginas.
**Pixel:** No tiene este concepto de "save configuration" global.

**Cómo hacerlo:**
- Botón flotante o en header "Save configuration"
- Modal que confirma si quiere persistir cambios a la OLT
- Bull queue que ejecuta `save` via Telnet/SSH

#### 16. Signal variation alert settings modal
**SmartOLT:** Modal en dashboard para configurar umbrales de variación de señal.
**Pixel:** No tiene.

**Cómo hacerlo:**
- Tabla `SignalThresholdConfig` en DB: variationThreshold, largeVariationDelta, multiOnuThreshold, trendWindowHours, trendMinEvents
- Modal de configuración en dashboard
- Bull queue `alertEngine` que usa estos thresholds

#### 17. Map view mejorado
**SmartOLT:** Coordenadas en ONU view + "Get current location" + "Open in Maps".
**Pixel:** Tiene MapView con Leaflet.

**Cómo hacerlo:**
- Añadir botones "Get current location" (geolocation API) y "Open in Maps" en ONU detail
- Clusters de ONUs en el mapa
- Capas: OLTs, ODBs, zonas

#### 18. Billing/subscription info
**SmartOLT:** Tabla de suscripción por OLT con fechas de vencimiento.
**Pixel:** No tiene.

**Cómo hacerlo:**
- Tabla `OltSubscription`: oltId, status (active/expired/trial), endDate
- Tab en Settings > Billing con tabla de estado de suscripciones

#### 19. Info feed / Activity log
**SmartOLT:** Panel derecho en dashboard con actividad reciente.
**Pixel:** No tiene.

**Cómo hacerlo:**
- Tabla `ActivityLog` en DB: userId, action, targetType, targetId, description, createdAt
- Componente `InfoFeed` en dashboard
- Enlace "View All" a página de activity log

#### 20. API Key management
**SmartOLT:** Settings > API key con generación/regeneración + logs.
**Pixel:** No expone API keys externas.

**Cómo hacerlo:**
- Tabla `ApiKey`: key, type, restrictionGroup, allowedIPs, isActive, createdAt
- Página de gestión con tabla de keys y logs de uso

#### 21. Multi-language support
**SmartOLT:** Language selector en Settings (Espanol).
**Pixel:** Solo español (presumiblemente).

**Cómo hacerlo:**
- i18n con react-i18next
- Settings > Language selector

#### 22. Theme toggle (night/light/system)
**SmartOLT:** Toggle entre tema oscuro/claro/sistema.
**Pixel:** Tema oscuro fijo actualmente.

**Cómo hacerlo:**
- useTheme hook con localStorage persistence
- Toggle en settings
- Tailwind dark mode class switch

---

### ⚪ PRIORIDAD BAJA — Detalles cosméticos/navegación

#### 23. Color picker personalizado en gráficos
#### 24. Update banner con dismiss
#### 25. Navigation breadcrumbs
#### 26. Loading states y skeleton screens
#### 27. Responsive mobile layout (Bootstrap 3 vs Pixel Tailwind)

---

## RESUMEN EJECUTIVO DE IMPLEMENTACIÓN

### Fase 1 — Base de datos y modelos (2-3 días)
- [ ] Tabla `AutoActionPreset`
- [ ] Tabla `AuthorizationPreset`
- [ ] Tabla `SpeedProfile` (55 registros seed)
- [ ] Tabla `OnuType` (70 registros seed)
- [ ] Tabla `SignalThresholdConfig`
- [ ] Tabla `ActivityLog`
- [ ] Tabla `ApiKey`
- [ ] Tabla `OltSubscription`
- [ ] Migrar `User` de in-memory a DB

### Fase 2 — Backend (5-7 días)
- [ ] Endpoint `POST /api/v1/onts/authorize` + lógica Telnet/SSH
- [ ] Endpoint `POST /api/v1/onts/:id/reboot` + resto de acciones ONU
- [ ] Bull queue `autoAuthorize`
- [ ] Bull queue `batchOperation`
- [ ] Endpoint `GET /api/v1/olts/:id/compare` (config mismatch)
- [ ] TR-069 profile CRUD
- [ ] VPN tunnel CRUD
- [ ] API Key management endpoints
- [ ] Activity log endpoint

### Fase 3 — Frontend (7-10 días)
- [ ] Página `/onu/unconfigured` con ONUs detectadas + auto-actions
- [ ] Página `/onts/:id` con 33 acciones + modales
- [ ] Página `/onu/authorize` con wizard multi-paso
- [ ] Página `/onu/authorization-presets` con wizard
- [ ] Página `/config-comparison`
- [ ] Batch operations panel en ONTs
- [ ] Página `/diagnostics` mejorada
- [ ] Reports: Tasks, Authorizations, Export, Import
- [ ] Zones + ODBs CRUD con import/export CSV
- [ ] VPN & TR-069 management page
- [ ] Save configuration modal global
- [ ] Signal variation settings modal
- [ ] Info feed en dashboard
- [ ] API Key management page
- [ ] Billing page
- [ ] Theme toggle (dark/light/system)

### Fase 4 — Producción (2-3 días)
- [ ] Dockerfile frontend (multi-stage build)
- [ ] Nginx reverse proxy config
- [ ] deploy.sh y backup.sh scripts
- [ ] Tests unitarios e integración (jest)
- [ ] CI/CD pipeline
