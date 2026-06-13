# Enriquecimiento de ONUs — FASE 2: clon exacto de la ficha de ONU de SmartOLT

> **Objetivo:** que la vista "ONU View" de la plataforma muestre **lo mismo que SmartOLT**,
> con datos reales tomados de la OLT (read-only). La FASE 1 ya trae lo básico; esta FASE 2
> agrega TODO lo que falta, con los comandos Huawei exactos y su formato de salida REAL
> (capturado de Itelsa-Mocoreta 10.200.51.40, ONU board 1/port 0/onu 18, modelo EG8021V5).

> **FASE 1 (ya hecha, en `main`):** model, firmware, sw_version, distance, line/srv profile,
> last_down_cause, configuration_method (Management mode), config/match state, board/port/onu_id.
> Job `enrichOnts` corre `display ont info` + `display ont version` por ONU.

---

## 🟢 PROMPT LISTO PARA PEGAR (próxima sesión)

```
Continuar Pixel Studios OLT — FASE 2 del enriquecimiento de ONUs: clonar la ficha de ONU de
SmartOLT con datos reales de la OLT. Seguir docs/ENRIQUECIMIENTO_ONU_FASE2.md AL PIE DE LA LETRA
(tiene cada campo de SmartOLT, el comando Huawei exacto, la salida real, el parseo y el campo DB).

Orden de trabajo:
1) GRUPO GRATIS (sin comando extra, ya viene en `display ont info` que el job ya ejecuta — solo
   ampliar `_parseOntDetailInfo`): Mgmt IP, TR069 (estado+IP index), temperatura, CPU, memoria,
   inventario de puertos (POTS/ETH/CATV), online duration, last up/down time, GPON channel.
2) WAN/IP/PPPoE/MAC: nuevo `display ont wan-info <port> <id>` → IPv4 access type (Static/DHCP/PPPoE),
   IPv4 address, máscara, gateway, Manage VLAN, MAC, L2 encap-type, IPv6, PPPoE username.
3) VLANs / Speed profiles: nuevo `display service-port port 0/<s>/<p> ont <id>` → Service-port ID,
   VLAN, GEM, traffic-table RX/TX (+ `display traffic table ip index <n>` para Mbps reales).
4) Ethernet ports: nuevo `display ont port state <port> <id> eth-port all` → speed/duplex/linkstate.
5) VoIP/CATV: solo si la ONU tiene POTS/CATV (ver inventario de puertos) — más adelante.

Reglas FIJAS:
- Validar SIEMPRE primero en la plataforma dev (PM2, http://192.168.3.173:5173, backend :3005)
  contra Mocoreta 10.200.51.40 (la OLT dev alcanzable). Recién después prod.
- Read-only contra OLTs (solo `display`). TDD: capturar salida real → fixture → parser.
- selectBatch filtra por enriched_at (NUNCA por model:null → bug ya corregido).
- Cada comando 🔴 extra multiplica el tiempo del barrido (~9000 ONUs en prod): los multi-comando
  conviene ponerlos en un job aparte o bajo demanda (al abrir la ficha), no en el barrido masivo.
- Deploy dev: editar /home → push → en /mnt `git pull` + `npx prisma generate` (si cambió schema)
  + `pm2 restart pixel-olt-backend`. Migración aislada (`prisma migrate diff --script`).
- Sanitizar PII (nombre/dirección del cliente en Description; MAC/IP) si se guardan fixtures.
```

---

## Archivos del código (dónde tocar)
- Parser detalle: `backend/src/services/huawei/ma5800.js` → `_parseOntDetailInfo` (🟡) + nuevos
  `_parseWanInfo`, `_parseServicePort`, `_parseEthPortState`.
- Comandos por ONU: `ma5800.js` → `getOntDetailInfoBatch(locations)` (agregar los `display` nuevos).
- Servicio/job: `backend/src/services/enrichmentService.js`, `backend/src/jobs/enrichOnts.js`.
- Modelo: `backend/prisma/schema.prisma` → `model ONT` (agregar columnas / JSON).
- UI: `frontend/src/pages/ONUView/index.jsx` (⚠️ ya colisionó con commits de reestructura — verificar).
- Tests/fixtures: `backend/src/services/huawei/__tests__/parsers.test.js` + `__fixtures__/`.

---

# MAPEO CAMPO POR CAMPO (ficha SmartOLT → comando → parseo → DB → UI)

## SECCIÓN 1 — Datos generales (panel principal)

| Campo SmartOLT | Estado FASE1 | Comando | Cómo parsear | Campo DB |
|---|---|---|---|---|
| OLT / Board / Port / ONU | ✅ | (scan) | board/port/onu_id | ✅ |
| GPON channel | 🟡 | (de F/S/P) | derivar de board/port | `channel` |
| SN | ✅ | — | — | `serial_number` |
| ONU type | ✅ | `display ont version` | Equipment-ID | `model` |
| Custom profile | ✅ | `display ont info` | Line/Service profile name | `line_profile`/`srv_profile` |
| Name / Address / Contact / external_id | ✅ | SNMP desc | — | ya |
| Authorization date | ✅ | — | created_at | ya |
| Status | ✅ | — | Run state | `status` |
| ONU/OLT Rx signal | ✅ | (signalHistory) | óptica | `rx_power`/`olt_rx_power` |
| **Mgmt IP** | 🟡/🔴 | `display ont info` (`ONT IP 0 address/mask`) **o** `display ont wan-info` (IPv4 address) | ver §2 y §3 | `mgmt_ip` ✅ |
| ONU mode | ✅ | `display ont info` | Management mode | `configuration_method` |
| **TR069** | 🟡 | `display ont info` | `TR069 management` + `TR069 IP index` | nuevo `tr069` |
| **WAN setup mode** | 🔴 | `display ont wan-info` | Connection type + access type | nuevo (§3) |
| **PPPoE username/password** | 🔴 | `display ont wan-info` | (en ONUs PPPoE) | `pppoe_user` ✅ |

---

## SECCIÓN 2 — 🟡 GRATIS: ampliar `_parseOntDetailInfo` (ya tenemos esta salida)

`display ont info <port> <id>` — **el job ya lo ejecuta**. Salida REAL (relevante, sanitizada):

```
  Memory occupation       : 60%
  CPU occupation          : 1%
  Temperature             : 44(C)
  Management mode         : OMCI
  ONT online duration     : 17 day(s), 3 hour(s), 2 minute(s), 45 second(s)
  Last up time            : 2026-05-27 09:31:31-03:00
  Last down time          : 2026-05-27 08:29:02-03:00
  ...
  TR069 management    :Enable
  TR069 IP index      :0
  ...
  Port-type     Port-number     Max-adaptive-number
  POTS          0               -
  ETH           2               -
  CATV          adaptive        8
```

Parseo (mismo patrón `grab(label)` ya existente en `_parseOntDetailInfo`):
| Campo | Label / regex | DB (nuevo salvo aclaración) |
|---|---|---|
| Temperatura | `Temperature` → num antes de `(C)` | `temperature` ✅ |
| CPU % | `CPU occupation` → num | `cpu_pct` (nuevo) |
| Memoria % | `Memory occupation` → num | `mem_pct` (nuevo) |
| TR069 | `TR069 management` (Enable/Disable) | `tr069_enabled` (nuevo) |
| TR069 IP index | `TR069 IP index` → num | `tr069_ip_index` (nuevo) |
| Online duration | `ONT online duration` → string | `online_duration` (nuevo) |
| Last up / down time | `Last up time` / `Last down time` | `last_up`/`last_down` (nuevo, DateTime) |
| Inventario puertos | bloque `Port-type … Port-number`: POTS/ETH/CATV/VDSL → contar | `ports` JSON `{pots,eth,catv,vdsl}` (nuevo) |
| Mgmt IP (si está) | `ONT IP 0 address/mask` (acá fue "-" → usar wan-info) | `mgmt_ip` ✅ |

> Nota: la VLAN/“Native VLAN option : Concern” NO es número; la VLAN real sale de service-port (§4).

---

## SECCIÓN 3 — 🔴 WAN / IP / PPPoE / MAC  → nuevo comando `display ont wan-info <port> <id>`

Cubre la sección **"WAN mode"** + **Mgmt IP** + **PPPoE** de SmartOLT. Salida REAL (sanitizada):

```
  Index                      : 1
  Name                       : 1_INTERNET_R_VID_10
  Service type               : Internet
  Connection type            : IP routed
  IPv4 Connection status     : Connected
  IPv4 access type           : Static
  IPv4 address               : 10.X.X.2
  Subnet mask                : 255.255.255.0
  Default gateway            : 10.X.X.1
  Manage VLAN                : 10
  NAT switch                 : Enable
  MAC address                : AAAA-BBBB-CCCC
  L2 encap-type              : IPoE
  IPv4 switch                : Enable
  IPv6 Connection status     : Invalid
  IPv6 address               : -
```

Parseo (`_parseWanInfo`, mismo patrón `grab`):
| Campo SmartOLT | Label | DB |
|---|---|---|
| WAN IP source / Config method | `IPv4 access type` (Static/DHCP/PPPoE) | `wan_ip_source` |
| IP Protocol / encap | `L2 encap-type` (IPoE/PPPoE) | `wan_encap` |
| IPv4 address | `IPv4 address` | `ip_address` ✅ |
| Subnet mask | `Subnet mask` | `wan_mask` |
| Default gateway | `Default gateway` | `wan_gateway` |
| WAN VLAN | `Manage VLAN` | `wan_vlan` |
| MAC address | `MAC address` | `mac` ✅ (existe, hoy null) |
| Connection type | `Connection type` (IP routed/bridged) | `wan_mode` ✅ |
| PPPoE username | `PPPoE username` (aparece en ONUs PPPoE; ésta es IPoE) | `pppoe_user` ✅ |
| IPv6 address/gateway/prefix | `IPv6 address` / … | `ipv6_*` (opcional) |

> Recomendado guardar todo el bloque WAN como JSON `wan_info` además de los escalares clave,
> porque una ONU puede tener varias WAN (Index 1, 2…) → array.

---

## SECCIÓN 4 — 🔴 Attached VLANs / Speed profiles → `display service-port port 0/<s>/<p> ont <id>`

Cubre la tabla **"Speed profiles"** y **"Attached VLANs"**. Salida REAL:

```
   INDEX VLAN VLAN     PORT F/ S/ P VPI  VCI   FLOW  FLOW       RX   TX   STATE
         ID   ATTR     TYPE                    TYPE  PARA
  -----------------------------------------------------------------------------
   16661   10 common   gpon 0/1 /0  18   1     vlan  10         32   30   up
```

Parseo (`_parseServicePort`, por fila — puede haber varias):
| Columna | Significado | Campo SmartOLT | DB |
|---|---|---|---|
| INDEX | Service-port ID | Service-port ID | `service_port_id` |
| VLAN ID | S-VLAN | SVLAN / Attached VLAN | `svlan` / `vlan` ✅ |
| VCI | GEM index | (interno) | `gem` |
| VPI | ONT ID | — | (=onu_id) |
| RX | índice traffic-table downstream | Download | `tt_rx` |
| TX | índice traffic-table upstream | Upload | `tt_tx` |
| STATE | up/down | — | `sp_state` |

> **Download/Upload reales (Mbps):** RX/TX son índices de traffic-table. Para el valor en Mbps:
> `display traffic table ip index <RX>` y `<TX>` → campo `CIR`/`PIR` (kbps). Cachear el mapeo
> índice→Mbps (son pocos perfiles) para no pedirlo por ONU.
> Guardar service-ports como JSON array `service_ports` (una ONU puede tener varios).

---

## SECCIÓN 5 — 🔴 Ethernet ports → `display ont port state <port> <id> eth-port all`

Cubre la tabla **"Ethernet ports"**. Salida REAL:

```
  ONT-ID   ONT      ONT       Speed(Mbps)   Duplex   LinkState  RingStatus
           port-ID  Port-type
  --------------------------------------------------------------------------
      18         1         GE 1000          full     up         noloop
      18         2         GE -             -        down       noloop
```

Parseo (`_parseEthPortState`, por fila):
| Columna | Campo SmartOLT | 
|---|---|
| ONT port-ID | Port |
| Port-type (GE/FE) + Speed(Mbps) + Duplex | Mode (ej. "GE 1000 full" / "down") |
| LinkState (up/down) | Admin state / link |
| RingStatus | (extra) |

> DB: JSON array `eth_ports` `[{port,type,speed,duplex,link,ring}]`.

---

## SECCIÓN 6 — 🔴 VoIP / CATV (baja prioridad — solo ONUs que los tengan)

Antes de pedirlos, mirar el **inventario de puertos** (§2): si `POTS = 0` no hay VoIP; si `CATV`
no está activa, no hay CATV. La ONU de prueba (EG8021V5) tiene POTS 0 / CATV adaptive → no aplica.
- POTS/VoIP: `display ont port state <port> <id> pots-port all` (falla si POTS=0).
- Confirmar en una ONU CON teléfono el comando de detalle VoIP (`display ont voip-info` dio
  "Unknown command" en este firmware — probar `display ont wan-info` con Service type=VoIP, o
  `display ont port state … pots-port all`).
- CATV: `display ont port state <port> <id> catv-port all`.

---

## Migración (cuando se agreguen columnas)
Generar **aislada** (solo columnas nuevas), no arrastrar drift:
```bash
cd backend
TS=$(date +%Y%m%d%H%M%S); mkdir -p prisma/migrations/${TS}_ont_fase2
# escribir a mano el ALTER TABLE "onts" ADD COLUMN ... (todas nullable / JSONB)
npx prisma db execute --file prisma/migrations/${TS}_ont_fase2/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied ${TS}_ont_fase2
npx prisma generate
```
Sugerencia de columnas nuevas: `cpu_pct Int? · mem_pct Int? · tr069_enabled Boolean? ·
tr069_ip_index Int? · online_duration String? · last_up DateTime? · last_down DateTime? ·
ports Json? · wan_info Json? · wan_ip_source String? · wan_mask String? · wan_gateway String? ·
wan_vlan Int? · service_ports Json? · eth_ports Json?` (mac, ip_address, wan_mode, vlan, pppoe_user,
mgmt_ip, channel ya existen).

## Restricciones / lecciones de FASE 1 (no repetir)
1. `selectBatch`: por `enriched_at` (null/stale), NUNCA por `model:null` (bucle en offline) — `a0eaf88`.
2. Lock VTY: `signalHistory` (óptica c/5min) acapara la sesión telnet; enrich avanza en huecos.
   `withOltLock` serializa por OLT en el proceso. NO correr scan/enrich como proceso separado.
3. Riesgo de lote: si la sesión se corta, `enrichBatch` marca todo el lote `enriched_at` sin datos.
4. Calibrar parsers contra salida real (varía por firmware). TDD con fixtures.
5. **Costo de red:** cada comando 🔴 = +1 sesión-comando por ONU. 5 comandos × 9000 ONUs es mucho;
   evaluar job separado / lazy-on-open para los pesados.

## Deploy (ver [[feedback_pixel_olt_dev_first]])
- Dev: editar /home → push → `/mnt git pull` → `prisma generate` → `pm2 restart pixel-olt-backend`.
  URL http://192.168.3.173:5173 · backend :3005 · DB docker :5432 · OLT dev Mocoreta 10.200.51.40.
- Prod 10.200.1.75: `git pull` + docker build/up + `prisma migrate deploy`. ⚠️ red prod↔OLT degradada (tarea aparte).
```
