# Diseño: Enriquecimiento de información de ONTs desde la OLT

**Fecha:** 2026-06-13
**Proyecto:** Pixel Studios OLT
**Rama:** `feat/ont-info-enrichment`
**Alcance:** Backend (toma de datos) + migración de schema + frontend mínimo

## Problema

El scan actual de ONTs (`oltService.scanOLTOnts` → `MA5800.listONTs`) trae solo un
subconjunto de la información que la OLT realmente tiene cargada por cada ONT:

- **Guarda hoy:** serial, status (online/offline), description, `external_id`/`contact`/`zone`/`odb`
  (vía SNMP), y RX/TX/temperatura (llenados aparte por el job de señal cada 5 min).
- **NO guarda, aunque la OLT lo tiene:** ubicación física (`board`/`port`/`onu_id` — se
  parsean pero se descartan), `model` (ej. EG8145V5), `firmware`/`sw_version`, perfil de
  línea/servicio, VLAN, distancia, estado de config/match, y causa de última caída.

Objetivo: que la plataforma traiga **toda la información que la OLT tiene cargada** de cada
ONT, sin frenar el scan rápido ni saturar las VTY (Telnet) limitadas de la OLT. En producción
hay ~9000 ONTs Huawei repartidas en ~6 OLTs.

## Restricción central: bulk vs. detalle

| Nivel | Comando | Costo | Tiempo aprox. (~1500 ONTs/OLT) |
|---|---|---|---|
| Bulk inventario | `display ont info 0 <slot> all` (1 por slot) | decenas de comandos | ~1–3 min |
| Bulk óptica | `display ont optical-info <port> all` (1 por puerto) | 1 por puerto | ~2–4 min |
| Detalle por ONT | `display ont detail-info <port> <onu_id>` (**1 por ONT**) | ~1–2 s × ONT | ~30–60+ min |

El detalle (model/firmware/perfil/VLAN/last-down-cause) requiere **un comando por ONT**, así
que no puede vivir dentro del scan que corre al cargar/editar una OLT. Va en un job de fondo.

## Enfoque elegido: híbrido

1. **Scan rápido** (al cargar/editar OLT y on-demand): inventario + ubicación física, ágil.
2. **Job de enriquecimiento Bull, repetible e incremental** (Enfoque 1): completa el detalle
   de a lotes chicos, respetando el lock de VTY, hasta que toda la base queda enriquecida; re-
   enriquece lo que esté viejo. Más un **disparador manual** `POST /olts/:id/enrich`.

Descartados: one-shot por OLT a mano (largo, hay que vigilarlo) como mecanismo único, y lazy
on-demand (la base nunca se completa sola). El lazy se puede sumar después si hace falta.

## Componentes

### 1. Scan rápido — persistir ubicación física
- **`MA5800._parseOntInfoOutput`**: ya devuelve `slot`/`pon_port`/`onu_id`. Sin cambios.
- **`oltService.scanOLTOnts`**: al crear/actualizar la ONT, mapear y guardar
  `board = slot`, `port = pon_port`, `onu_id = onu_id`.
- **Beneficio colateral:** las acciones de ONU (`_ontAction`) podrán usar la ubicación de DB
  y saltarse el `_resolveBySn` (un comando telnet menos por acción).
- La óptica se mantiene como está (job de señal cada 5 min). No se toca en este trabajo.

### 2. Parser de detalle por ONT — nuevo `MA5800.getOntDetailInfo(location)`
- Dentro de `interface gpon 0/<board>`, corre `display ont detail-info <port> <onu_id>`
  (read-only). Si `model`/`firmware` no vienen en esa salida en el firmware de estas OLTs,
  complementar con `display ont version <port> <onu_id>`.
- Parsea a: `model`, `firmware`, `sw_version`, `line_profile`, `srv_profile`, `vlan`,
  `distance`, `last_down_cause`, y estado config/match (a `configuration_method` o campo nuevo
  si hace falta).
- **PRIMER PASO DE IMPLEMENTACIÓN (read-only, seguro en prod):** capturar la salida real de
  UNA ONT en producción para calibrar el parser. El formato Huawei varía por firmware (ya pasó
  con la óptica: Santa Ana incluye `Distance`, Feliciano no). Guardar la captura como fixture.
- Reutiliza el patrón de sesión raw socket existente (`_session`/`collect`/`waitFor`) y el
  `withOltLock(ip)` para no agotar VTYs.

### 3. Job de fondo — `enrichOnts` (Bull repetible)
- Cada `ENRICH_INTERVAL_MS` (default p.ej. 60000) toma un lote de `ENRICH_BATCH_SIZE`
  (default p.ej. 50) ONTs con `model IS NULL` **o** `enriched_at` anterior a N días
  (`ENRICH_STALE_DAYS`, default 7), de OLTs Huawei en estado `ONLINE`.
- Agrupa por OLT, abre **una** sesión telnet por OLT (vía `withOltLock`), itera las ONTs del
  lote de esa OLT, parsea y hace `prisma.oNT.update` con los campos + `enriched_at = now()`.
- Marcas/guardas idempotentes: una ONT enriquecida no se vuelve a tocar hasta la ventana de
  re-enriquecimiento. Si una ONT falla (offline, no encontrada), se marca `enriched_at` igual
  para no reintentar en bucle cada tick (se reintenta en la próxima ventana stale).
- VSOL/KingType: no-op por ahora (el adapter Huawei es el único que implementa
  `getOntDetailInfo`).

### 4. Endpoint manual — `POST /api/v1/olts/:id/enrich`
- Encola el enriquecimiento de esa OLT (todas sus ONTs, ignorando `enriched_at`) en el job.
  RBAC: admin/noc. Devuelve `{ queued: <n> }`.

### 5. Schema (migración vía `migrate deploy`)
Agregar a `model ONT`:
- `enriched_at      DateTime?`
- `last_down_cause  String?`
- `line_profile     String?`
- `srv_profile      String?`

(`model`, `firmware`, `sw_version`, `vlan`, `distance`, `board`, `port`, `onu_id` ya existen.)
Migración generada de forma no interactiva (`prisma migrate diff ... --script`) y aplicada en
prod con `migrate deploy` (nunca `migrate dev` ni seed).

### 6. Frontend (mínimo)
- Mostrar los campos nuevos en la vista de ONT / ONUView: modelo, firmware/sw_version, perfil
  de línea/servicio, VLAN, distancia, última caída. Solo cablear datos ya guardados; sin
  cambios de estructura.

## Tests
- Parsers (`_parseOntDetailInfo`, y el de `display ont version` si se usa) como funciones puras
  con **fixtures de la salida real capturada** en producción (al menos 2 firmwares distintos).
  TDD: escribir el test con el fixture, luego el parser.
- Test del job: con un adapter mockeado, verificar que selecciona el lote correcto, agrupa por
  OLT, y persiste los campos + `enriched_at`.
- Los comandos contra OLTs reales son todos `display` (read-only) → seguros en producción.

## Reglas de producción (memoria del proyecto)
- Producción = `10.200.1.75` (Debian + Docker). Flujo: probar local → push GitHub → en server
  `git pull` + `docker compose build && up -d` + `npx prisma migrate deploy`.
- NUNCA en el server: `node prisma/seed.js`, `docker compose down -v`, `migrate dev`.
- El `backend/.env` del server (secretos + `AUTH_RW_HASH`) no se pisa en deploys.
- Solo comandos de lectura (`display ...`) contra las OLTs Huawei de producción.

## Fuera de alcance (YAGNI)
- Lazy on-demand enrichment (se evalúa después).
- Enriquecimiento de VSOL/KingType (otro instructivo, credenciales aparte).
- Traer óptica dentro del scan (ya lo cubre el job de señal).
- Rediseño de la vista de ONT (solo se cablean los campos nuevos).

## Variables de entorno nuevas
```
ENRICH_INTERVAL_MS=60000     # cadencia del job de fondo
ENRICH_BATCH_SIZE=50         # ONTs por tick
ENRICH_STALE_DAYS=7          # re-enriquecer ONTs más viejas que esto
```
