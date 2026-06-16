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
| Claude Code | main | Análisis gap SmartOLT completo (2026-06-16) → ver §5.4. Correcciones: CC-3 ✅ CC-5 ✅ bugs dashboard ✅ | ✅ análisis completo, tareas en §5.4 | 2026-06-16 |
| OpenCode | main | OC-1 ✅ OC-2 ✅ OC-3 ✅ OC-4 ✅ OC-5 ✅ — ver §5.4 para nuevas tareas | pendiente §5.4 | 2026-06-16 |

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

### 7.4 Checklist rápido antes de commitear

Antes de marcar una tarea como ✅ y commitear, pasá este checklist:

- [ ] **Traza completa**: Si agregué un campo al formulario, ¿aparece en el `prisma.create/upsert` del service?
- [ ] **Nombres de campo**: ¿Verifiqué en `prisma/schema.prisma` que el campo que uso en código existe y se llama exactamente así?
- [ ] **Columnas vs. texto**: ¿Estoy usando columnas tipadas del schema en lugar de parsear texto libre?
- [ ] **Tests**: Si la lógica está en un helper, ¿tiene tests que cubren el camino real (no solo el happy path)?
- [ ] **Grep de integración**: `grep -rn "mi_nuevo_campo" backend/src/` — ¿aparece en el endpoint, el controller Y el service?
