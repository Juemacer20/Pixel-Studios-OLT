# COLLAB.md — Reglas OBLIGATORIAS de trabajo entre IAs

> ⚠️ **LECTURA OBLIGATORIA antes de tocar el repo.** En este proyecto trabajan **dos agentes de
> IA en paralelo** (Claude Code y OpenCode) sobre el mismo repositorio. Estas reglas son de
> cumplimiento obligatorio para ambos. No son sugerencias. Si vas a editar, commitear o tocar el
> entorno, primero leé y respetá esto.

---

## 1. Git — higiene OBLIGATORIA (evita pisarse y perder trabajo)

- ✅ Commitear **SOLO los archivos propios, por nombre**: `git add ruta/archivo1 ruta/archivo2`.
- ❌ **PROHIBIDO** `git add .`, `git add -A`, `git add --all` (te llevás el trabajo sin commitear de la otra IA).
- ❌ **PROHIBIDO** `git reset --hard`, `git checkout -- <archivo>`, `git stash` sobre archivos que la otra IA pueda estar editando → **eso borra trabajo no commiteado y NO se recupera**.
- ✅ Antes de `push` a `main`: `git pull --rebase origin main`. Si el rebase falla por cambios sin
  commitear ajenos, **NO** los descartes — avisá al usuario.
- ✅ Mensajes de commit claros y con prefijo de área (`feat(enrich):`, `feat(ui-onts):`, etc.).

## 2. Ramas (forma preferida de trabajar)

Cada IA en su propia rama; integración por PR / merge coordinado:
- Claude Code → ramas `feat/enrich-*`, `feat/huawei-*`.
- OpenCode → ramas `feat/onts-*`, `feat/vsol-*`, `feat/kingtype-*`, `feat/ui-*`.
- Mergear a `main` de a una. Nunca dos pushes simultáneos a `main` sin rebase.

## 3. Propiedad de áreas (quién toca qué)

| Área / archivos | Dueño principal | Notas |
|---|---|---|
| `backend/src/services/huawei/*` (adapter, parsers) | **Claude** | enriquecimiento de ONUs |
| `backend/src/services/enrichmentService.js`, `jobs/enrichOnts.js` | **Claude** | FASE 1 hecha; FASE 2 pendiente (ver `docs/ENRIQUECIMIENTO_ONU_FASE2.md`) |
| `backend/src/services/vsol/*`, `kingtype/*` | **OpenCode** | adapters VSOL/KingType |
| `frontend/src/pages/ONTs/*` | **OpenCode** | página ONTs pixel-perfect |
| `frontend/src/pages/ONUView/*` | **COMPARTIDO** ⚠️ | coordinar / turnarse; Claude agrega campos de enriquecimiento, OpenCode los modales/estructura |
| `backend/prisma/schema.prisma` | **COMPARTIDO** ⚠️ | avisar antes de migrar; migraciones aisladas |
| `frontend/src/services/api.js` | **COMPARTIDO** ⚠️ | solo agregar, no reescribir lo ajeno |

> Si tenés que tocar un archivo COMPARTIDO, hacelo en una sola pasada, commiteá enseguida y avisá
> en la sección 5.

## 4. Entorno (NO solo el código)

- **PM2:** el backend/frontend dev corren en PM2 (`pixel-olt-backend` :3005, `pixel-olt-frontend` :5173,
  desde `/mnt/claude-storage/proyectos/Pixel-Studios-OLT`). **No reiniciar PM2 ni matar procesos sin
  avisar.** Para desplegar a dev: `cd /mnt/... && git pull` + `npx prisma generate` (si cambió schema)
  + `pm2 restart pixel-olt-backend`.
- **Puerto 3001** = contenedor `rutatrack-api-1` (otro proyecto). NO usar para OLT. Backend OLT = **3005**.
- **OLTs (telnet/VTY):** cada OLT tiene ~5 sesiones VTY. **No correr scans/enriquecimiento contra la
  misma OLT en paralelo** (se pisan y dan resultados vacíos). Coordinar quién corre barridos.
  OLT dev alcanzable: **Itelsa-Mocoreta 10.200.51.40**.
- **Checkouts:** `/home/juan/Pixel-Studios-OLT` = edición; `/mnt/.../Pixel-Studios-OLT` = lo que CORRE en PM2.
- **DB dev:** Postgres docker `localhost:5432`, Redis `:6379`. NO truncar/borrar tablas sin avisar.

## 5. Tablón de trabajo activo (ACTUALIZAR cada sesión)

> Cada IA edita SU línea acá al empezar/terminar, así la otra sabe qué está tocando.

| IA | Rama | Archivos/área en curso | Estado | Fecha |
|---|---|---|---|---|
| Claude Code | feat/cc-dashboard-autoactions | Relevamiento fresco 2026-06-16 → BATCH 3 definido (CC-10..CC-15). Empezar por CC-11 (IP logging) y CC-13 (export fields). | 🟡 pendiente BATCH 3 | 2026-06-16 |
| OpenCode | main | BATCH 3 definido (OC-11..OC-18). Empezar por OC-11 (SVLAN names) y OC-12 (ODB coords). CC-10 (ODB port schema) debe mergearse antes de OC tocar locationDetails. | 🟡 pendiente BATCH 3 | 2026-06-16 |

---

## 5.4 🆕 BATCH 2 — Análisis detallado función por función (2026-06-16)

> Análisis función por función, vista por vista, del código de ambas plataformas.
> Documento completo: `docs/ANALISIS_GAP_SMARTOLT.md`.
> CC-3 ✅ CC-5 ✅ y bugs dashboard ya corregidos en esta sesión.

### 🔴 Para CLAUDE CODE (backend + full-stack)

| # | Prioridad | Tarea | Archivos | Notas |
|---|---|---|---|---|
| CC-6 | 🔴 CRÍTICO | **ONTs: server-side filtering + pagination** — El endpoint `GET /onts` actualmente devuelve hasta 500 registros. ITELSA tiene 12K+ ONTs: todos los filtros y batch ops trabajan sobre datos incompletos. Agregar params: `?search=&olt_id=&status=&zone=&board=&port=&vlan=&signal=&page=&limit=25` al endpoint. Frontend: cambiar `ontAPI.list({ limit: 500 })` a `ontAPI.list(activeFilters)` con todos los filtros activos como params de query — el filtrado pasa al backend. | `backend/src/routes/onts.js`, `frontend/src/pages/ONTs/index.jsx` | Esto requiere cambiar la arquitectura del filtrado: backend filtra, frontend solo renderiza el resultado paginado. Prioridad máxima. |
| CC-7 | 🟠 ALTO | **Fix OC-2 backend gap** — `ontService.js → authorizeONT()` recibe `externalId`, `configMethod`, `voipEnabled`, `iptvEnabled`, `iptvVlan`, `catvEnabled` desde el controller pero NO los incluye en el `prisma.oNT.upsert({ data: { ... } })`. Se descartan silenciosamente. Agregar esos campos al upsert. Verificar también que `svlanId`, `cvlanId`, `tagTransform`, `downloadSpeedId`, `uploadSpeedId` persisten correctamente. | `backend/src/services/ontService.js` | Bug documentado en §7.1. Usar el checklist de §7.4 antes de commitear. |
| CC-8 | 🟠 ALTO | **Settings: endpoints GET/PUT para General y Polling** — Las tabs General y Polling de Settings muestran formularios pero el botón Save solo hace `setSaved(true)` (stub visual, no llama a ningún API). Crear: `GET /settings/general` + `PUT /settings/general` (campos: company, timezone, language, logo_url) y `GET /settings/polling` + `PUT /settings/polling` (campos: interval, snmp_timeout, snmp_retries, snmp_version, snmp_community). Guardar en tabla `SystemConfig` (clave→valor) o `GeneralSettings` si ya existe. Conectar frontend. | `backend/src/routes/settings.js`, `frontend/src/pages/Settings/index.jsx` | Tabla `SystemConfig` puede ya existir — revisar schema.prisma antes de crear migración. |
| CC-9 | 🟡 MEDIO | **ONT Drawer — tab Eventos** — `const events = []` hardcodeado en ONTs/index.jsx, siempre vacío. Crear `GET /onts/:id/events` (puede ser auditLog filtrado por `target = ont.id` o `details.sn = ont.serial_number`). Frontend: useQuery con `enabled: tab === 5 && !!ont?.id`, mapear a lista de eventos con tipo/mensaje/timestamp. | `backend/src/routes/onts.js`, `frontend/src/pages/ONTs/index.jsx` | Puede reutilizar el mismo `buildActivityFeed` del dashboard con un where filter. |

### 🔴 Para OPENCODE (frontend — sin tocar backend salvo lo acordado)

| # | Prioridad | Tarea | Archivos | Notas |
|---|---|---|---|---|
| OC-6 | 🟠 ALTO | **ONT Drawer — tab Servicios: datos reales** — Tab 2 del drawer lateral en ONTs/index.jsx tiene datos hardcodeados (VoIP/IPTV/CATV siempre mock, VLANs 100/200/300 fijas). Reemplazar con datos reales del objeto `ont`: `ont.voip_mode` (enabled/disabled), `ont.has_iptv` + `ont.iptv_vlan`, `ont.has_catv`, `ont.vlan`, `ont.svlan`, `ont.cvlan`. La UI puede mantenerse igual, solo cambiar los valores. | `frontend/src/pages/ONTs/index.jsx` (función `ONTDrawer`, `tab === 2`) | Verificar primero qué campos devuelve la API en el objeto ont. Si faltan campos, pedirle a Claude que los agregue al select de la query. |
| OC-7 | 🟠 ALTO | **ONT Drawer — tab WAN/IP: datos reales** — Tab 3 tiene datos hardcodeados (WAN mode DHCP fijo, IP 192.168.1.100, gateway 192.168.1.1, DNS 8.8.8.8). Reemplazar con datos reales: `ont.wan_mode`, `ont.ip_address`. Para gateway/DNS, si no existen en el schema, mostrar "—" en lugar de datos inventados. Nunca mostrar IPs falsas al operador. | `frontend/src/pages/ONTs/index.jsx` (función `ONTDrawer`, `tab === 3`) | Lo más importante es NO mostrar datos inventados. Mejor "—" que 192.168.1.1 hardcodeado. |
| OC-8 | 🟡 MEDIO | **ChangeOnuTypeModal — lista hardcodeada** — En `ONUView/index.jsx`, `ChangeOnuTypeModal` tiene `ONU_TYPES = ['HG8245H', ...]` y `PROFILES = ['Generic_1', ...]` hardcodeados. Reemplazar con `useQuery` a `onuTypeAPI.list()` y `speedProfileAPI.list()`. Los imports de esas APIs ya existen. | `frontend/src/pages/ONUView/index.jsx` | Verificar que `onuTypeAPI` y `speedProfileAPI` están importados en ese archivo. |
| OC-9 | 🟡 MEDIO | **Diagnostics — reemplazar Tailwind con CSS vars** — `pages/Diagnostics/index.jsx` usa clases Tailwind (`className="text-red-400"`, `className="bg-gray-800"`) mientras el resto de la app usa CSS custom vars (`style={{ color: 'var(--red)' }}`). Convertir todas las clases Tailwind a inline styles con CSS vars. Agregar columna "ONU" (interfaz GPON, campo `ont.description`) que SmartOLT muestra. | `frontend/src/pages/Diagnostics/index.jsx` | Ver cómo OnuModals, ONUView y ONTs formatean los estilos para mantener consistencia. |
| OC-10 | 🟡 MEDIO | **Reports/Import — verificar o implementar** — SmartOLT tiene `/reports/import` (importación masiva CSV). Verificar si existe en el frontend. Si no, agregar tab "Import" en Reports con el mismo `ImportLocationModal` que ya existe en ONTs (input file CSV + botón Import). Backend: `POST /reports/import` puede ya existir. | `frontend/src/pages/Reports/index.jsx` | El modal `ImportLocationModal` ya está implementado en `ONTs/index.jsx`, reutilizar. |

### Notas de coordinación §5.4

- **CC-6 (server-side ONTs)** afecta la interfaz del query en `frontend/src/pages/ONTs/index.jsx`. **OC-6 y OC-7** también tocan ese archivo. Coordinar: CC-6 primero → OC-6/OC-7 después del merge.
- **CC-8 (Settings API)** y los tabs de Settings van por rutas separadas del archivo — sin conflicto directo.
- **OC-8 (ONUView)** y las tareas CC de ONUView — son en archivos diferentes, sin conflicto.
- **Orden recomendado**: CC-7 (fix OC-2 gap, aislado) → CC-6 (server-side, coordinado) → OC-6/OC-7 después de CC-6 → el resto en paralelo.

---

## 5.3 🆕 NUEVO BATCH DE TAREAS — Gap analysis SmartOLT vs Pixel (2026-06-16)

> Análisis completo hecho por Claude Code el 2026-06-16 comparando SmartOLT (relevamiento autenticado)
> contra el código actual. Plataforma ~99% completa — estas son las diferencias que quedan.
> Las tareas están divididas por propiedad de área (ver §3).

### 🔴 Para OPENCODE (frontend, sin tocar backend)

| # | Tarea | Archivos | Rama sugerida |
|---|---|---|---|
| OC-1 | **ONUView: botones faltantes en barra de acciones** — Agregar botones para los modales que ya existen pero no tienen trigger: `VoIP service` → `setModal({type:'VoIP service'})`, `Update IPTV` → `setModal({type:'Update IPTV'})`, `EPON channel` → `setModal({type:'Update EPON channel'})`, `Web user/pass` → `setModal({type:'webPass'})`. Todos los modales ya están definidos en `OnuModals.jsx`, solo falta el botón en la barra de acciones rápidas del footer. | `frontend/src/pages/ONUView/index.jsx` | `feat/ui-onuview-triggers` |
| OC-2 | **Auth wizard: campos faltantes** — Agregar al wizard (`/onu/authorize`) en el paso de Configuration (step 2): External ID (input texto), Método de config (select OMCI/TR069); y al paso final (step 4 o nuevo step 5) los servicios al autorizar: VoIP enable (checkbox), IPTV enable + VLAN (checkbox + input), CATV enable (checkbox). El backend ya tiene `ontAPI.authorize(form)` y el controller acepta esos campos. | `frontend/src/pages/AuthorizeONU/index.jsx` | `feat/ui-authorize-fields` |
| OC-3 | **Configured ONUs: auditar batch ops UI** — Verificar cuáles de las 15+ operaciones masivas de SmartOLT están implementadas en la UI de batch del `ONTs/index.jsx`. Las que falten agregar: Change VLAN (Add/Remove/Replace), SVLAN/CVLAN, Tag-transform, Change ONU Type, Change Custom Profile, Set Mgmt IP, WAN config, IPv6, Web user/pass masivo, Move zone+ODB, DNS, DHCP Option 82, PPPoE Plus. El endpoint backend `/onts/batch` ya existe. | `frontend/src/pages/ONTs/index.jsx` | `feat/ui-batch-ops` |
| OC-4 | **TopNav: botón global "Save config"** — Agregar botón "Save config" en `TopNav.jsx`, igual al que tiene SmartOLT en la barra superior. Al hacer click abrir el mismo `SaveConfigModal` que ya existe en ONUView (moverlo a `shared/` o duplicar). El endpoint backend ya existe (`ontAPI.saveConfig()`). | `frontend/src/components/layout/TopNav.jsx` | `feat/ui-topnav-saveconfig` |
| OC-5 | **Billing/Subscription en Settings** — Agregar tab "Billing" en `pages/Settings/index.jsx`. UI simple: tabla OLT → Subscription status → End date + botón "View payment options". Datos mockeados o endpoint GET `/settings/billing` si no existe (Claude lo crea si se necesita). | `frontend/src/pages/Settings/index.jsx` | `feat/ui-settings-billing` |

### 🔴 Para CLAUDE (backend + full-stack)

| # | Tarea | Archivos | Rama sugerida |
|---|---|---|---|
| CC-1 | **Dashboard: panel PON outage + Info feed** — Nuevo endpoint `GET /dashboard/pon-outage` (ONUs sin señal > 7 días, agrupadas por PON) + `GET /dashboard/activity-feed` (log de actividad del sistema: autorizaciones, reboots, backups, WAN changes — con paginación). Frontend: dos nuevos paneles en `pages/Dashboard/index.jsx` idénticos a SmartOLT. | `backend/src/routes/dashboard.js`, `frontend/src/pages/Dashboard/index.jsx` | `feat/dashboard-pon-outage` |
| CC-2 | **Unconfigured: modal "Configure auto-actions"** — El botón "Configure actions" actualmente llama `saveMut.mutate(null)` (roto). Crear modal `AutoActionsConfigModal` con los campos de SmartOLT: condiciones (OLT, board, port, pon_type, sn_pattern), acción (auto-authorize on/off, preset a aplicar), stop/start. Backend: `GET/POST/PUT /auto-actions/config`. La tabla `autoActions` puede ya existir — revisar. | `backend/src/routes/autoActions.js`, `frontend/src/pages/Unconfigured/index.jsx` | `feat/autoactions-config` |
| CC-3 | **Reports Export: selector de campos** — Ampliar `GET /reports/export` para aceptar lista de campos seleccionables (los ~85 de SmartOLT: SN, name, OLT, board, port, zone, ODB, signal, VLAN, perfil, etc.). Frontend: UI con checkboxes agrupados por categoría + historial de exportaciones previas (tabla Created/Filters/Status/ONUs/Download). | `backend/src/routes/reports.js`, `frontend/src/pages/Reports/index.jsx` | `feat/reports-export-fields` |
| CC-4 | **VPN Tunnels page** — Nueva página `/vpn` + sección en Settings dropdown. Backend: `GET/POST/PUT/DELETE /vpn-tunnels`. Frontend: tabla #/Username/Status(Tunnel IP, Logs, Since)/Subnet/Connected subnets/Actions + botón "Create tunnel" + modal "Mikrotik VPN setup" (genera config). Solo si es necesario para ITELSA (OLTs detrás de NAT). | `backend/src/routes/` (nuevo), `frontend/src/pages/` (nuevo), `frontend/src/components/layout/TopNav.jsx` | `feat/vpn-tunnels` |
| CC-5 | **API Logs en Settings** — `GET /api-keys/logs` (ya puede existir en `apiKeys.js`) + tab "API Logs" en Settings: tabla Timestamp/Method/Path/Status/User con paginación y filtros. | `backend/src/routes/apiKeys.js`, `frontend/src/pages/Settings/index.jsx` | `feat/settings-api-logs` |

### Notas de coordinación

- **ONUView es COMPARTIDO** (§3): OC-1 y CC-1 no tocan el mismo archivo. OC-1 solo toca `ONUView/index.jsx`. ✅ sin conflicto.
- **Settings es COMPARTIDO**: OC-5 (Billing tab) y CC-5 (API Logs tab) tocan `Settings/index.jsx`. **Hacerlos en ramas separadas y mergear de a uno.**
- **Dashboard**: CC-1 toca `Dashboard/index.jsx`. Si OpenCode tiene cambios pendientes ahí, coordinar.
- **Orden recomendado**: OC-1 primero (rápido, alto impacto), CC-1 y OC-2 en paralelo, luego el resto.

## 5.2 📩 PEDIDO de Claude Code → OpenCode (2026-06-14) — paridad SmartOLT

Hice una **auditoría visual lado a lado** con SmartOLT (logueé y capturé las 20 páginas en
`/home/juan/smartolt-audit/`). **Buenísima noticia: Pixel ya es un espejo ~99% completo** — casi
todos los gaps que se sospechaban están implementados (las 33 acciones de ONU, los filtros+batch,
Settings con tab Notifications, Tasks en el nav, Export, etc.).

**Lo único que queda para cerrar el espejo está detallado en `docs/PARIDAD_SMARTOLT_PENDIENTES.md`:**
1. 🌐 **i18n / selector de idioma** (Settings › General) — **único faltante funcional real**. El doc
   tiene el paso a paso (react-i18next, locales es/en, selector, default es). Puede hacerse por fases.
2. 🎨 Paridad de íconos Font Awesome 4.7 (cosmético, baja prioridad — la guía lo da por aceptable).
3. ✅ Certificación funcional de las 33 acciones de ONU contra OLT dev (verificación, con la REGLA
   DE SEGURIDAD de §4: nada destructivo sobre ONUs de clientes).

Prioridad: 1 > 3 > 2. Capturas de referencia en `/home/juan/smartolt-audit/screenshots/`. — Claude

---

## 5.1 ✅ RESUELTO por Claude (2026-06-14) — sección TV en ONUView

> **Ya no hace falta que lo hagas, OpenCode.** El usuario me pidió que lo cierre yo, así que agregué
> la sección **TV** a `frontend/src/pages/ONUView/index.jsx` (un bloque `<dt>TV services</dt>` con
> badge verde "CATV (RF)" + LinkState/dBmV y badge azul "IPTV (multicast)" + VLAN, mismo estilo que
> Speed profiles). Solo toqué ESE archivo compartido, en una pasada. Detalle abajo (histórico).

**Tu UI de ONUView (commit `c6ef611`) ya mostraba casi todos los campos de enriquecimiento de la
FASE 2** (GRATIS, WAN, service-port, eth-port) — ¡buenísimo! Faltaban solo **los 4 campos de TV** que
agregué después de tu commit (`873210b`):

**Sección TV — CATV (RF) vs IPTV (multicast)** — son servicios DISTINTOS, mostralos separados:
- `has_catv` (Boolean) → badge "CATV" si true. La ONT tiene puerto RF (TV por coaxial).
- `catv_ports` (Json) → `[{port, link(up/down), tx_power_dbmv(número o null)}]`. Mostrar LinkState y
  la potencia RF en dBmV (si es `null`, mostrar "—" pero el puerto igual está up; pasa en ONUs
  Broadcom GP1704 que no dan lectura).
- `has_iptv` (Boolean) → badge "IPTV" si true. La ONT maneja multicast.
- `iptv_vlan` (Int) → VLAN multicast (si aplica).

Detalle completo en **`docs/UI_ONUVIEW_FASE2.md`** (sección "📺 TV — CATV (RF) vs IPTV (multicast)").
Datos reales para probar: OLT **Itelsa-SantaAna** (ya en dev), ONUs con CATV ej. seriales
`HWTC5D8E7B9F`, `HWTC3EFA909B` (Huawei, con dBmV) y `BDCM6B195DE0` (Broadcom, dBmV=null).
`ONUView/*` es COMPARTIDO: lo dejo para vos (no lo toqué). Gracias! — Claude

## 6. Regla de oro

> **No toques lo que no es tuyo sin avisar. Commiteá solo lo tuyo, por nombre. Ante la duda, frená
> y preguntá al usuario.** El objetivo es sumar, no pisarse.

---

## 7. Checklist de calidad — lecciones del code review (2026-06-16)

> Estas reglas surgieron de bugs reales encontrados en la revisión post-implementación.
> **Son de cumplimiento obligatorio antes de commitear cualquier tarea.**

---

### 7.1 Regla de traza completa (aplica a OPENCODE principalmente)

**Cuando agregás un campo a un formulario frontend, DEBÉS trazar el dato hasta la escritura en DB.**

El flujo obligatorio a verificar es:

```
form state → API call → controller → service function → prisma upsert/create
```

**Antecedente real (OC-2, 2026-06-16):** OpenCode agregó `externalId`, `configMethod`,
`voipEnabled`, `iptvEnabled`, `catvEnabled` al wizard de autorización. El formulario los envía y el
controller los recibe, pero `ontService.js → authorizeONT()` no los persistía en el `upsert`.
Los datos llegaban al backend y se descartaban silenciosamente. Sin trazar el flujo completo,
el bug es invisible.

**Cómo verificarlo antes de commitear:**

```bash
# 1. Grep el nombre del campo en el service layer:
grep -n "externalId\|external_id" backend/src/services/ontService.js

# 2. Si no aparece → el backend lo ignora → el campo no se persiste → BUG.
# 3. Si aparece → verificá que esté dentro del upsert/create, no solo en una validación.
```

**Regla:** Si el campo no está en el `data: { ... }` del `prisma.modelo.upsert()` o `create()`,
no existe en la DB. "El backend acepta esos campos" NO es correcto si el service los descarta.

---

### 7.2 Regla de verificación de nombres de campo (aplica a AMBAS IAs)

**Antes de acceder a un campo de un registro de DB, verificar que ese campo existe en `prisma/schema.prisma`.**

**Antecedente real (CC-1, 2026-06-16):** `buildActivityFeed()` retornaba `user: row.user` pero el
schema de `AuditLog` tiene `user_id`, no `user`. En producción siempre era `undefined`.

**Cómo verificarlo:**

```bash
# Buscar el modelo en el schema:
grep -A 20 "model AuditLog" backend/prisma/schema.prisma

# Verificar que el campo que usás en código coincide exactamente con el del schema.
```

**Regla:** El nombre en el schema es la fuente de verdad. `user` ≠ `user_id`. `olt` ≠ `olt_id`.
`description` es texto libre, no un campo de coordenadas o ubicación.

---

### 7.3 Regla de columnas vs. texto derivado (aplica a AMBAS IAs)

**Si el schema tiene una columna numérica para un dato, usala directamente. No la derives de un campo de texto libre.**

**Antecedente real (CC-1, 2026-06-16):** `buildPonOutage()` parseaba `board` y `port` del campo
`description` con una regex `(\d+)\/(\d+)\/(\d+)`. `description` es el nombre del cliente
("García, Juan"). En producción nunca matcheaba y el panel PON outage siempre aparecía vacío.
Las columnas reales `board INT` y `port INT` ya existían en el schema.

**Cómo verificarlo:**

```bash
# Ver qué columnas tiene el modelo antes de "derivar" datos de texto:
grep -A 70 "model ONT " backend/prisma/schema.prisma | grep -E "board|port|description"
```

**Regla:** Si `schema.prisma` tiene `board Int?` y `port Int?`, usar `o.board` y `o.port`.
Si usás `description` para extraer coordenadas o posiciones → es un bug garantizado.

---

---

## 5.5 🆕 BATCH 3 — Gaps del relevamiento fresco 2026-06-16

> Relevamiento autenticado nuevo (login fresco, 21 páginas + ONUView 34 modales).
> Documento de referencia: `/mnt/claude-storage/relevamiento-smartolt/nuevo/ANALISIS_PARIDAD_2026-06-16.md`
> Plataforma ~92% completa. Estos son los gaps reales restantes.

### 🔴 Para CLAUDE CODE (backend + full-stack)

| # | Prioridad | Tarea | Archivos | Notas |
|---|---|---|---|---|
| CC-10 | 🔴 CRÍTICO | **ODB port — schema + backend** — SmartOLT registra en qué puerto físico del splitter (1/2/3…/16) está conectado cada cliente. Agregar campo `odb_port Int?` a `ONT` en schema.prisma + migración. Agregar a: `authorizeONT()` (persist), `updateLocationDetails()` (persist), `getAllONTs()` select, `GET /onts/:id` include. Frontend avisa cuando CC-10 esté mergeado. | `backend/prisma/schema.prisma`, `backend/src/services/ontService.js` | Preguntar a Juan si ITELSA usa este dato. Si no lo usan, bajar a 🟡. |
| CC-11 | 🟠 ALTO | **IP address en auditLog** — SmartOLT logea la IP del operador en cada acción (info feed muestra "IP address" columna). El modelo AuditLog tiene `ip_address String?` en schema. Verificar si el middleware de auth extrae `req.ip` y lo pasa al `auditLog.create()`. Si no, agregar `ip_address: req.ip` en todos los `prisma.auditLog.create()` del backend. | `backend/src/middleware/auth.js`, `backend/src/routes/onts.js`, `backend/src/services/ontService.js` | Hacer grep de `auditLog.create` y agregar `ip_address` en todos. |
| CC-12 | 🟠 ALTO | **"Authorized by" en ONUView** — Panel izquierdo de ONUView muestra quién autorizó la ONU. La info está en `auditLog` donde `action = 'AUTHORIZE_ONT'` y `target = ont.id`. Agregar endpoint `GET /onts/:id/authorized-by` que retorna `{ user_id, created_at }` del auditLog de autorización, o incluirlo directamente en el `GET /onts/:id`. Frontend: mostrar en panel izquierdo como "Authorized by: juancervini / 2026-06-10". | `backend/src/routes/onts.js`, `backend/src/controllers/ontController.js`, `frontend/src/pages/ONUView/index.jsx` | Verificar que el AUTHORIZE_ONT se guarda con el user_id correcto (CC-7 ya lo hace). |
| CC-13 | 🟠 ALTO | **Export fields faltantes** — Agregar a `reports.helpers.js` los campos que SmartOLT tiene pero Pixel Studios no exporta: `client_name` (resolve desde `ont.client.name`), `client_address` (desde `ont.client.address`), `client_phone` (desde `ont.client.phone`), `svlan` (alias de `vlan`), `cvlan`, `tag_transform`, `odb_port`, `authorized_by` (query auditLog action=AUTHORIZE_ONT). Solo editar `EXPORT_FIELDS` array y `resolveValue()`. | `backend/src/routes/reports.helpers.js` | No tocar el test de reports — solo agregar al array. Verificar que `resolveValue()` resuelve client.name desde la relación. |
| CC-14 | 🟡 MEDIO | **TR069 Stat modal** — SmartOLT tiene botón "TR069 Stat" en ONUView que muestra diagnóstico TR-069 de la ONU. Crear endpoint `GET /onts/:id/tr069-stat` que llama al adapter Huawei para obtener el estado TR-069 (si el adapter lo soporta). Frontend: modal simple que muestra la respuesta raw en un `<pre>`. | `backend/src/routes/onts.js`, `backend/src/services/huawei/ma5800.js`, `frontend/src/pages/ONUView/index.jsx` | El adapter puede no soportarlo — retornar `{ supported: false }` y el modal muestra "Not supported for this OLT type". |
| CC-15 | 🟡 MEDIO | **Batch "Offline duplicate + Missing from OLT"** — Dos checkboxes en la barra de batch de ONTs: (1) "Offline duplicate" filtra ONUs con SN duplicado donde un gemelo está Online; (2) "Missing from OLT" filtra ONUs en DB que el OLT reportó como no existentes en el último scan. Backend: agregar params `duplicate=1` y `missing_from_olt=1` a `getAllONTs()`. Frontend: checkboxes especiales en el panel batch. | `backend/src/services/ontService.js`, `frontend/src/pages/ONTs/index.jsx` | Para "Missing from OLT" se necesita que el scan marque un campo — verificar si el enrichment job guarda ese estado. |

### 🔴 Para OPENCODE (frontend — sin tocar backend salvo lo acordado)

| # | Prioridad | Tarea | Archivos | Notas |
|---|---|---|---|---|
| OC-11 | 🟠 ALTO | **SVLAN names en wizard** — El wizard de autorización muestra el SVLAN-ID como número solo (ej: "10") pero SmartOLT lo muestra con nombre (ej: "10 - INTERNET"). La API `GET /vlans` o similar devuelve los VLANs con nombre. Buscar el endpoint que carga VLANs (puede ser `GET /onts?distinct=vlan` o un endpoint dedicado). Cambiar el select de SVLAN-ID en `AuthorizeONU/index.jsx` para mostrar `{vlan.id} - {vlan.name}`. | `frontend/src/pages/AuthorizeONU/index.jsx` | Verificar si hay un `vlanAPI` o si hay que fetchear desde los filtros de ONTs. Si no hay nombre en DB, mostrar solo el número (no cambiar el backend). |
| OC-12 | 🟠 ALTO | **ODB coordinates en tabla + form** — SmartOLT muestra lat/lng del splitter en la tabla de ODBs. Agregar columna "Coordinates" a la tabla en `ODBs/index.jsx` (mostrar "lat, lng" o "—"). Agregar campos Latitude/Longitude al formulario de crear/editar ODB en el `ActionModal`. El schema ya tiene los campos si `napBoxId` o similar existe — verificar. | `frontend/src/pages/ODBs/index.jsx` | Verificar en `prisma/schema.prisma` si el modelo `ODB` o `NapBox` tiene `latitude`/`longitude`. Si no existen, marcar como bloqueado por schema (pedir a Claude CC-10 los agregue). |
| OC-13 | 🟡 MEDIO | **Allow custom profiles en ONU Types** — Agregar columna "Custom" (checkbox readonly) a la tabla de ONU Types en `OnuTypes/index.jsx`. El campo `allowCustomProfiles` ya existe en el form de edición pero no en la tabla. | `frontend/src/pages/OnuTypes/index.jsx` | Solo agregar `<th>Custom</th>` y `<td><YesNo v={t.allowCustomProfiles}/></td>`. |
| OC-14 | 🟡 MEDIO | **Speed profiles: For/Default/ONUs count** — Agregar campos a SpeedProfiles: (1) "For" select (Internet/VoIP/IPTV/Any) en el form; (2) "Default" checkbox; (3) columna "ONUs" (count de ONTs que usan ese perfil) en la tabla. El backend `GET /speed-profiles` puede necesitar que CC agregue el count — preguntar a Claude. | `frontend/src/pages/SpeedProfiles/index.jsx` | "For" y "Default" son campos nuevos en el schema — bloquear hasta que CC los agregue. "ONUs count" puede venir del endpoint si lo soporta. |
| OC-15 | 🟡 MEDIO | **applyPresetModal: campo ONU name** — En `Unconfigured/index.jsx`, el modal "Authorize ONU with Preset" (`applyPresetModal`) debe incluir un input text para el nombre del cliente (campo `preset_onu_name`). SmartOLT lo tiene como campo requerido al aplicar preset rápido. | `frontend/src/pages/Unconfigured/index.jsx` | Ver cómo está implementado el modal actualmente. Agregar input "ONU name" y pasarlo al mutationFn. |
| OC-16 | 🟡 MEDIO | **Wizard: "Use custom profile" y "Use GPS"** — En `AuthorizeONU/index.jsx`: (1) Agregar checkbox "Use custom profile" antes del select de ONU type (cuando está checked, se habilita un select de template genérico); (2) Agregar checkbox "Use GPS" antes de los inputs lat/lng (cuando está unchecked, ocultar lat/lng). Ambos son quality-of-life. | `frontend/src/pages/AuthorizeONU/index.jsx` | "Use custom profile" puede ser simplemente un toggle que muestra/oculta un select de templates. Los templates pueden ser hardcodeados o fetcheados. |
| OC-17 | 🟡 MEDIO | **ONU ID range override en GPONChannelModal** — SmartOLT `updateGponType` tiene campo adicional "ONU ID range override" (radio: auto/custom). Agregar esa opción en `OnuModals.jsx → GPONChannelModal`. | `frontend/src/pages/ONUView/OnuModals.jsx` | Verificar si el adapter Huawei acepta ese parámetro. Si no, mostrar el campo pero no enviarlo si el backend no lo soporta. |
| OC-18 | 🟡 MEDIO | **VPN tunnels: columna "Connected subnets"** — En `TR069/index.jsx`, la tabla VPN tunnels tiene Name/Subnet/Status pero le falta "Connected subnets" (subredes locales ruteadas por el tunnel). Agregar columna al `<Section>` de VPN y al formulario de creación. Backend: verificar si el campo existe en `VpnTunnel` model. | `frontend/src/pages/TR069/index.jsx` | Si el campo no existe en el schema, marcar como bloqueado por schema — pedir a Claude que lo agregue. |

### Notas de coordinación §5.5

- **CC-10 (ODB port schema) bloquea a OC** si OC quiere mostrar/editar el campo en el wizard o locationDetails. CC-10 es schema-only, puede ejecutarse independiente.
- **CC-11 (IP logging) es backend-only** — no bloquea a OC en nada.
- **CC-12 (Authorized by) toca ONUView/index.jsx** — no tocar ese archivo simultáneamente. CC primero, OC después.
- **CC-13 (export fields) es backend-only** — no bloquea a OC.
- **OC-11 a OC-18 son TODOS independientes entre sí** — OC puede hacer en cualquier orden.
- **Orden recomendado para CC**: CC-11 → CC-13 (ambos rápidos y sin conflictos) → CC-12 → CC-10 → CC-14 → CC-15.
- **Orden recomendado para OC**: OC-11 → OC-12 → OC-13 → OC-15 → OC-16 → OC-17 → OC-18 → OC-14 (OC-14 espera info del schema).

---

### 7.4 Checklist rápido antes de commitear

Antes de marcar una tarea como ✅ y commitear, pasá este checklist:

- [ ] **Traza completa**: Si agregué un campo al formulario, ¿aparece en el `prisma.create/upsert` del service?
- [ ] **Nombres de campo**: ¿Verifiqué en `prisma/schema.prisma` que el campo que uso en código existe y se llama exactamente así?
- [ ] **Columnas vs. texto**: ¿Estoy usando columnas tipadas del schema en lugar de parsear texto libre?
- [ ] **Tests**: Si la lógica está en un helper, ¿tiene tests que cubren el camino real (no solo el happy path)?
- [ ] **Grep de integración**: `grep -rn "mi_nuevo_campo" backend/src/` — ¿aparece en el endpoint, el controller Y el service?
