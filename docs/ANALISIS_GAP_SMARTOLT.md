# Análisis de Paridad SmartOLT vs Pixel Studios OLT

> Análisis función por función, vista por vista.
> Realizado: 2026-06-16. Fuente SmartOLT: `/mnt/claude-storage/relevamiento-smartolt/RELEVAMIENTO_SMARTOLT.md`.
> Código analizado: frontend completo + backend routes.

---

## Resumen ejecutivo

| Estado | Páginas |
|---|---|
| ✅ Bien alineado | Dashboard, Graphs, ConfigComparison, Reports/Tasks, Reports/Authorizations, Reports/Export, AuthPresets |
| ⚠️ Funcional pero con gaps | Unconfigured, ONTs/Configured, ONUView, Settings |
| ❌ Bugs bloqueantes | ONT Drawer (tabs Servicios/WAN/Eventos), Settings General/Polling sin persistir, ONTs carga parcial de datos |

---

## Vista por vista

### 1. Dashboard ✅

| Función SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|
| 4 stat boxes (Waiting/Online/Offline/Warning) | ✅ | ✅ |
| Network status chart (5 rangos de tiempo) | ✅ | ✅ |
| PON outage panel | ✅ (corregido 2026-06-16) | ✅ |
| OLTs status panel | ✅ | ✅ |
| Info feed / activity log | ✅ (corregido 2026-06-16) | ✅ |
| ONU authorizations per day | ✅ | ✅ |

Bugs corregidos en sesión: `buildPonOutage` usaba `description` para parsear board/port (regex sobre texto libre) → corregido a usar `o.board` y `o.port`. `buildActivityFeed` retornaba `user: row.user` (undefined) → corregido a `user: row.user_id`.

---

### 2. Unconfigured ONUs ⚠️

| Función SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|
| Paneles por OLT con ONUs pendientes | ✅ | ✅ |
| Botón Authorize → wizard completo | `/onu/authorize` (5 pasos) | ✅ la ruta existe |
| Modal "Apply preset" para auth rápida | `applyPresetModal` | ⚠️ no implementado |
| Auto Actions config (panel colapsable) | `AutoActionsConfigModal` | ✅ (OC-2 completado) |
| Saved ONUs para autorizar luego | ✅ | ✅ |
| Botón "Task history" → /reports/tasks | ✅ | ✅ |

---

### 3. AuthorizeONU wizard ⚠️

Wizard de 5 pasos EXISTS en `/onu/authorize`. Campos detectados en frontend:

| Campo SmartOLT | Estado frontend | Estado backend (ontService.js) |
|---|---|---|
| OLT, Board, Port, SN, PON type | ✅ step 1 | ✅ persiste |
| ONU type, SVLAN, CVLAN, tag-transform | ✅ step 2 | ⚠️ **REVISAR** |
| Download/Upload speed profile | ✅ step 3 | ⚠️ **REVISAR** |
| Zone, ODB, Name, Address, Contact, Lat/Lng | ✅ step 4 | ⚠️ **REVISAR** |
| External ID | ✅ en form | ❌ **NO persiste** (bug OC-2) |
| Config method (OMCI/TR069) | ✅ en form | ❌ **NO persiste** (bug OC-2) |
| VoIP enabled | ✅ en form | ❌ **NO persiste** (bug OC-2) |
| IPTV enabled + VLAN | ✅ en form | ❌ **NO persiste** (bug OC-2) |
| CATV enabled | ✅ en form | ❌ **NO persiste** (bug OC-2) |

**Bug OC-2:** `ontService.js → authorizeONT()` recibe todos los campos pero el `prisma.oNT.upsert()` no los incluye en el objeto `data: { }`. Se descartan silenciosamente.

---

### 4. Configured ONUs (ONTs) ⚠️

| Función SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|
| ~24 filtros (search, OLT, board, port, zone, ODB, VLAN, status, signal, ONU type, profile, PON type, TR069, VoIP, CATV, config method, IP protocol, SVLAN, CVLAN, tag-transform, WAN mode, Mgmt IP, Resync failed, Status changed) | ✅ todos implementados | ✅ |
| Filtros de status como pills (iconos) | ✅ | ✅ |
| Batch operations (15+ ops) | ✅ via `/onts/batch` | ✅ |
| Paginación | Client-side (500 ONTs) | ❌ **CRÍTICO** |
| Sorting | Client-side | ✅ ok para pocas filas |
| Import/Export masivo CSV | ✅ | ✅ |
| Tabla columnas principales | Status/View/Name/SN/MAC/ONU/Zone/ODB/Signal/B/R/VLAN/VoIP/TV/Type/Auth date | ⚠️ columnas similares, B/R pill funciona |
| Drawer lateral al click de fila | ✅ 6 tabs | ⚠️ 3 tabs son mock data |

**Bug CRÍTICO — carga client-side:**
```javascript
queryFn: () => ontAPI.list({ limit: 500 })  // ← max 500 ONTs
```
ITELSA tiene ~12,447 ONTs. El filtrado, sorting y batch ops operan sobre el subconjunto de 500. Todos los resultados son incorrectos para producción. Necesita server-side filtering con parámetros `?search=&olt_id=&status=&page=&limit=`.

**Bug — filterPort usa `description`:**
```javascript
const ponPorts = rawONTs.map(o => o.description)  // ← texto libre de interfaz
if (filterPort) list = list.filter(o => o.description === filterPort)
```
El filtro de Port debería filtrar por `o.port` (Int) o por board+port combinados. Usando `description` filtra por el string de la interfaz GPON lo cual puede funcionar, pero es frágil e inconsistente con cómo funciona `filterBoard` (que sí usa `o.board`).

---

### 5. ONT Drawer (panel lateral de ONTs page) ❌

El drawer abre al hacer click en una fila de ONTs. Tiene 6 tabs:

| Tab | Estado | Problema |
|---|---|---|
| 0 — Resumen | ✅ | Datos reales del ONT |
| 1 — Señal | ✅ | Chart real de señal histórica |
| 2 — Servicios | ❌ | **TODO HARDCODED** — VoIP/IPTV/CATV siempre con valores mock, VLANs 100/200/300 fijas |
| 3 — WAN/IP | ❌ | **TODO HARDCODED** — WAN mode DHCP fijo, IP 192.168.1.100 fija, gateway 8.8.8.8 |
| 4 — DHCP | ✅ | Leases reales via API |
| 5 — Eventos | ❌ | `const events = []` — siempre vacío, nunca se pobla |

```javascript
// Tab 2 — Servicios (hardcoded mock):
{ key: 'datos', label: 'Datos', active: true, vlan: 100, speed: '100 Mbps ↓ / 50 Mbps ↑' },
{ key: 'voip',  label: 'VoIP',  active: false, vlan: 200 },
{ key: 'iptv',  label: 'IPTV',  active: false, vlan: 300 },

// Tab 3 — WAN/IP (hardcoded mock):
<InfoRow label="Dirección IP" value={ont.ip_address || '192.168.1.100'} />
<InfoRow label="Gateway"      value="192.168.1.1" />  ← hardcoded
<InfoRow label="DNS Primario" value="8.8.8.8" />      ← hardcoded

// Tab 5 — Eventos (siempre vacío):
const events = [];  // ← nunca se asigna nada
```

**Fix correcto para Tab 2 — Servicios:** Leer campos reales del objeto `ont`:
- `ont.voip_mode` (enabled/disabled)
- `ont.has_iptv` + `ont.iptv_vlan`
- `ont.has_catv`
- `ont.vlan`, `ont.svlan`, `ont.cvlan`

**Fix correcto para Tab 3 — WAN/IP:** Leer campos reales del objeto `ont`:
- `ont.wan_mode`
- `ont.ip_address`
- Otros campos WAN si existen en schema

**Fix correcto para Tab 5 — Eventos:** Llamar a endpoint de audit log filtrado por ONT:
- Backend: `GET /onts/:id/events` (puede ser un alias de auditLog filtrado por target = ont.id)
- Frontend: useQuery con `enabled: tab === 5 && !!ont?.id`

---

### 6. ONUView (vista completa de gestión de ONU) ⚠️

Vista accesible desde el botón "View" en la tabla de ONTs. Implementa los 33 modales de acción de SmartOLT.

| Función SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|
| Panel info izquierda (OLT, Board, Port, ONU, Name, Zone, ODB, External ID, Address, Contact, Lat/Lng, Auth date) | ✅ | ✅ |
| Panel señal (RX/TX/OLT RX/Distancia/MAC/IP/Firmware/Serial) | ✅ | ✅ |
| Traffic chart (Upload/Download) | ✅ `TrafficChart` | ✅ |
| Signal chart (RX/TX histórico) | ✅ `SignalChart` | ✅ |
| Speed profiles table | ✅ | ✅ |
| Ethernet ports table | ✅ | ⚠️ verificar si real vs mock |
| WiFi table | ✅ | ⚠️ verificar si real vs mock |
| VoIP service | ✅ `VoIPModal` | ✅ |
| IPTV / CATV | ✅ | ✅ (agregado en FASE 2) |
| Web user pass | ✅ `WebUserPassModal` | ✅ |
| Reboot, Delete, Disable, Enable | ✅ | ✅ |
| Resync config | ✅ | ✅ |
| Restore defaults | ✅ `FirmwareUpgradeModal` | ✅ |
| Change ONU type | ✅ `ChangeOnuTypeModal` | ⚠️ lista hardcoded |
| Replace by SN | ✅ `ReplaceBySNModal` | ✅ |
| Update attached VLANs | ✅ `VLANModal` | ✅ |
| Update location details | ✅ `UpdateLocationModal` | ✅ |
| Move ONU | ✅ `MoveOnuModal` | ✅ |
| History | ✅ `HistoryModal` | ✅ |
| TR069 Profile | ✅ `TR069ProfileModal` | ✅ |
| Mgmt IP | ✅ `MgmtIPModal` | ✅ |
| GPON Channel | ✅ `GPONChannelModal` | ✅ |
| Reallocate ID | ✅ `ReallocateIdModal` | ✅ |
| Ext ID | ✅ `ExtIdModal` | ✅ |

**Bug — ChangeOnuTypeModal lista hardcoded:**
```javascript
const ONU_TYPES = ['HG8245H', 'HG8240H', 'HG8010H', ...];  // ← hardcoded
const PROFILES = ['Generic_1', 'Generic_2', ...];           // ← hardcoded
```
Debe fetchear desde `onuTypeAPI.list()` y `speedProfileAPI.list()`.

---

### 7. Graphs ✅

Tabs OLT / Uplink / PON / Traffic / Signal todos implementados con datos reales, paginación y modal de vista ampliada.

---

### 8. Diagnostics ⚠️

| Función SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|
| Tabla con señal en tiempo real | ✅ | ✅ |
| Columna Rx 1310 (OLT) | "Rx OLT dBm" | ✅ |
| Columna Rx 1490 (ONU) | "Rx ONU dBm" | ✅ |
| Columna ONU (interfaz GPON) | Falta | ❌ |
| Columna "Status changed" | "Último cambio" (en español) | ⚠️ inconsistente |
| CSS consistente con app | Usa **Tailwind CSS** | ❌ el resto usa CSS vars |
| Filtro Export | ✅ | ✅ |

---

### 9. ConfigComparison ✅

Bien alineado. Select OLT + Scan & Compare + Fix (sync DB) funcionales.

---

### 10. Reports — Tasks ✅

Filtros User/Action/From/To, paginación, tabla correcta. Bien alineado.

---

### 11. Reports — Authorizations ✅

Filtros search/from/to, Export CSV, paginación. Bien alineado.

---

### 12. Reports — Export ✅

Implementado con field selector (CC-3, 2026-06-16): 58 campos en 8 categorías, filtros OLT/Status/Search, historial de exportaciones en localStorage.

SmartOLT tiene ~85 campos. El delta son campos más avanzados de configuración de red (DHCP Option 82, PPPoE+, IPv6, custom profiles detallados) que pueden agregarse al `EXPORT_FIELDS` en `reports.helpers.js` cuando sea necesario.

---

### 13. Settings ⚠️

| Tab | SmartOLT | Pixel Studios OLT | Estado |
|---|---|---|---|
| General | Company/Timezone/Language | Implementado | ❌ **NO persiste** — `save()` es stub |
| Polling | SNMP config | Implementado | ❌ **NO persiste** — `save()` es stub |
| Signal Thresholds | — | Implementado | ✅ conectado a API real |
| API Logs | ✅ | Implementado (CC-5) | ✅ |
| API Keys | ✅ | Implementado | ✅ |
| Billing | ✅ por OLT | Implementado (OC-5) | ✅ |
| Users | Gestión usuarios | `src/pages/Users/` | ⚠️ verificar |
| Notifications | Email/SMS/Webhook | No implementado | ❌ falta |

**Bug — Settings General/Polling:**
```javascript
const save = () => {
  setSaved(true);
  setTimeout(() => setSaved(false), 2500);  // ← solo visual, no llama a ningún API
};
```
No existe endpoint `PUT /settings/general` ni `PUT /settings/polling`. Los cambios se pierden al recargar.

---

### 14. AuthPresets ✅

Wizard Create Preset con campos: name, description, oltId, ponType, snPattern, onuTypeId, fallbackOnuTypeId, mode, svlanId, cvlanId, downloadSpeedId, uploadSpeedId, zoneId, odbId. Bien alineado con SmartOLT.

---

### 15. OLTs page ✅ (verificar)

Página `src/pages/OLTs/`. No leída en detalle — verificar que tiene Add OLT, tabla con View/Status/Name/IP/HW version/SW version/Actions.

---

### 16. Zones, ODBs, OnuTypes, SpeedProfiles ✅ (verificar)

Páginas catalog existen (`src/pages/Zones/`, `ODBs/`, `OnuTypes/`, `SpeedProfiles/`). No leídas en detalle.

---

### 17. TR069 page ⚠️

`src/pages/TR069/` existe. SmartOLT tiene: VPN Tunnels tab + TR069 Profiles tab. Verificar si VPN tunnels está implementado.

---

## Bugs ordenados por impacto

### 🔴 CRÍTICO (rompe producción)

1. **ONTs carga solo 500 registros** (`limit: 500` hardcoded en queryFn). Con 12K+ ONTs de ITELSA, todos los filtros y batch ops trabajan sobre datos incompletos.

### 🟠 ALTO (funcionalidad engañosa)

2. **ONT Drawer tab Servicios** — datos hardcoded, muestra info falsa al usuario.
3. **ONT Drawer tab WAN/IP** — datos hardcoded, muestra info falsa.
4. **ONT Drawer tab Eventos** — `events = []`, siempre vacío.
5. **OC-2 backend gap** — `externalId`, `configMethod`, `voipEnabled`, `iptvEnabled`, `iptvVlan`, `catvEnabled` no se persisten en DB al autorizar.
6. **Settings General/Polling** — guardar no hace nada, los cambios se pierden.

### 🟡 MEDIO (incompleto pero no engañoso)

7. **ChangeOnuTypeModal lista hardcoded** — debería fetchear de `onuTypeAPI`.
8. **Diagnostics Tailwind CSS** — inconsistente con el sistema de diseño del resto de la app.
9. **Diagnostics columna ONU faltante** — SmartOLT la muestra.
10. **Settings Notifications tab** — falta para alertas email/webhook.

---

## Plan de tareas — ver COLLAB.md §5.4
