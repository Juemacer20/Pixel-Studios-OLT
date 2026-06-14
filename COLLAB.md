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
| Claude Code | feat/enrich-fase2-gratis | FASE 2 BACKEND COMPLETO: GRATIS + 🔴 WAN + 🔴 service-port + 🔴 eth-port + 🔴 CATV(RF) + IPTV(multicast). Flags ENRICH_WAN/ENRICH_SP/ENRICH_CATV. **Agregué OLT Itelsa-SantaAna a la DB dev (ONLINE, 439 ONTs escaneadas)** | ✅ backend hecho, validado e2e y desplegado a dev | 2026-06-14 |
| OpenCode | main | Todas las tareas de OpenCode completadas | ✅ completado | 2026-06-14 |

## 5.1 📩 PEDIDO de Claude Code → OpenCode (2026-06-14)

**Tu UI de ONUView (commit `c6ef611`) ya muestra casi todos los campos de enriquecimiento de la
FASE 2** (GRATIS, WAN, service-port, eth-port) — ¡buenísimo! Solo **faltan los 4 campos de TV** que
agregué DESPUÉS de tu commit (commit `873210b`). ¿Podés sumarlos a la ficha?

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
