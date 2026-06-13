# Enriquecimiento de ONUs — FASE 2 (campos faltantes vs SmartOLT)

> **Estado:** pendiente para próxima sesión. La FASE 1 (model, firmware, sw_version,
> distance, line/srv profile, last_down_cause, configuration_method, config/match state,
> board/port/onu_id) ya está **completa, mergeada en `main` y validada e2e en dev** (2026-06-13).

---

## 🟢 PROMPT LISTO PARA PEGAR (próxima sesión)

```
Continuar el enriquecimiento de ONUs de Pixel Studios OLT (FASE 2). La FASE 1 ya trae
model/firmware/perfiles/distancia/última-caída/config (ver docs/ENRIQUECIMIENTO_ONU_FASE2.md
y project memory). Quiero agregar los campos de la ficha de ONU de SmartOLT que todavía
faltan, empezando por el GRUPO "gratis" (ya vienen en la salida de `display ont info` que el
job ya ejecuta — solo falta parsear): Mgmt IP, TR069 (estado + IP index), GPON channel,
inventario de puertos (ETH/POTS/CATV), y temperatura/CPU/memoria de la ONT.

Luego, del grupo "caro" (1 comando telnet extra por ONU), implementar SOLO los que confirme:
VLANs/service-port (SVLAN/User-VLAN/Download/Upload) y WAN/PPPoE.

Reglas: validar SIEMPRE en la plataforma dev de esta PC (PM2, http://192.168.3.173:5173,
backend :3005) ANTES de prod; comandos read-only contra las OLTs; calibrar parsers contra
salida real (la OLT dev alcanzable es Itelsa-Mocoreta 10.200.51.40). Usar TDD con fixtures.
Tener en cuenta el bug ya corregido de selectBatch (no filtrar por model:null) y el lock de
VTY que comparte signalHistory. Deploy a dev = git pull en /mnt + pm2 restart pixel-olt-backend.
```

---

## Contexto técnico (dónde está todo)

- **Adapter Huawei MA5800:** `backend/src/services/huawei/ma5800.js`
  - `_parseOntDetailInfo(raw)` ← parsea `display ont info <port> <id>` (acá se agregan los campos 🟡).
  - `_parseOntVersion(raw)` ← parsea `display ont version <port> <id>`.
  - `getOntDetailInfoBatch(locations)` ← abre 1 sesión telnet/OLT, corre los `display` por ONU (acá se agregan comandos 🔴).
  - Fixtures reales en `backend/src/services/huawei/__fixtures__/` (ont-info-8_50.txt, ont-info-43_25.txt, etc.).
- **Servicio:** `backend/src/services/enrichmentService.js` (`selectBatch`, `enrichBatch`).
- **Job Bull:** `backend/src/jobs/enrichOnts.js` (cada `ENRICH_INTERVAL_MS`, lote `ENRICH_BATCH_SIZE`).
- **Endpoint manual:** `POST /api/v1/olts/:id/enrich` (en `backend/src/routes/olts.js`).
- **Modelo Prisma:** `backend/prisma/schema.prisma` → `model ONT`.
- **UI:** `frontend/src/pages/ONUView/index.jsx` (mostrar campos nuevos; OJO: ya hubo colisión
  con commits de reestructura — verificar que las filas no se pisen).
- **Tests:** `backend/src/services/huawei/__tests__/parsers.test.js` (TDD parsers).

---

## Comparación con la ficha de ONU de SmartOLT

### ✅ Ya lo trae el código (FASE 1)
ONU type (model), SN, firmware, sw_version, Status, Rx/OLT signal, distancia, board/port/onu_id,
Name/Address/Contact/external_id (SNMP), Config method (OMCI/TR069), Line/Service profile,
última caída (last_down_cause), config/match state.

### 🟡 GRUPO "GRATIS" — ya viene en `display ont info`, solo falta parsear (sin comando extra)
| Campo SmartOLT | Etiqueta en `display ont info` | Campo DB (ya existe?) |
|---|---|---|
| Mgmt IP | `ONT IP 0 address/mask` | `mgmt_ip` ✅ existe |
| TR069 estado + IP index | `TR069 management` / `TR069 IP index` | (nuevo: `tr069_status` o reusar) |
| GPON channel | F/S/P / T-CONT | `channel` ✅ existe |
| Puertos físicos (ETH/POTS/CATV) | bloque `Port-type … Port-number` | (nuevo: JSON `ports` o columnas) |
| Temp / CPU / memoria ONT | `Temperature` / `CPU occupation` / `Memory occupation` | `temperature` ✅ existe; CPU/mem nuevos |

> Recomendado arrancar por acá: **cero costo de red**, solo más parseo en `_parseOntDetailInfo`.
> Verificar contra el fixture real `ont-info-8_50.txt` (tiene ONT IP, TR069 management, etc.).

### 🔴 GRUPO "CARO" — 1 comando telnet extra por ONU (impacta el tiempo del barrido en prod ~9000 ONUs)
| Campo SmartOLT | Comando Huawei | Campo DB |
|---|---|---|
| Attached VLANs / SVLAN / User-VLAN | `display service-port port 0/<s>/<p> ont <id>` | `vlan` ✅; SVLAN/uservlan nuevos |
| Speed profiles (Download/Upload) | `display service-port` (traffic-table) | (nuevo) |
| WAN mode / Config method / IP Protocol / WAN IP / máscara / gateway | `display ont wan-info 0/<s>/<p> ont <id>` | `wan_mode` ✅, `ip_address` ✅, nuevos |
| PPPoE username / password | `display ont wan-info` | `pppoe_user` ✅ |
| Ethernet ports (Admin state / Mode / DHCP) | `display ont port state 0/<s>/<p> <id> eth-port all` | (nuevo: JSON) |
| VoIP service | `display ont voip-info` | (nuevo) |
| CATV | `display ont catv-info` | (nuevo) |

> Decidir con Juan CUÁLES valen la pena. Más recomendados: **VLANs/service-port** y **WAN/PPPoE**.
> Cada comando extra por ONU multiplica el tiempo del barrido; pensar si va en el mismo job o
> en uno separado/bajo demanda.

---

## Restricciones / lecciones de FASE 1 (no repetir errores)
1. **selectBatch:** seleccionar por `enriched_at` (null/stale), **NUNCA por `model: null`** — las ONUs
   offline no devuelven model y se re-seleccionan en bucle (bug ya corregido, commit `a0eaf88`).
2. **Lock de VTY:** `signalHistory` (óptica cada 5 min) acapara la sesión telnet ~3 de cada 5 min;
   el enrich avanza en las ventanas libres. `withOltLock` serializa por OLT dentro del proceso.
   NO correr scans/enrich como proceso separado (compite por VTY).
3. **Riesgo de lote:** si la sesión telnet se corta a mitad de lote, `enrichBatch` marca todo el
   lote con `enriched_at` (sin datos). Lotes chicos (50) = menor blast radius.
4. **Calibrar parsers** contra salida real (el formato Huawei varía por firmware) — TDD con fixtures.
5. **Migración** (si se agregan columnas): `prisma migrate diff --script` aislado (solo las nuevas),
   luego `migrate deploy`. NO arrastrar el drift del schema (modelos vsol_* sin migración).

## Deploy (ver [[feedback_pixel_olt_dev_first]])
- **Dev (validar primero):** editar en /home o /mnt → push → `cd /mnt/.../Pixel-Studios-OLT && git pull`
  → `npx prisma generate` (si cambió schema) → `pm2 restart pixel-olt-backend`. Frontend recarga solo (vite).
  - URL dev: http://192.168.3.173:5173 · backend :3005 · DB docker localhost:5432.
- **Prod 10.200.1.75:** `git pull` + `docker compose -f infra/docker/docker-compose.prod.yml build && up -d`
  + `npx prisma migrate deploy`. ⚠️ Prod tiene red degradada a las OLTs (tarea aparte) — no toma datos aún.
