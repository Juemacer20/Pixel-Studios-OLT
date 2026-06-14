# Tarea para OpenCode — UI de ONUView con datos enriquecidos (FASE 2)

> **Contexto:** el backend de la FASE 2 del enriquecimiento de ONUs **ya está hecho, validado e2e
> y desplegado a dev** (Claude Code). El job `enrichOnts` ahora puebla un montón de columnas nuevas
> en la tabla `onts`. **Falta mostrarlas en la ficha de ONU (`frontend/src/pages/ONUView/`)** para
> que se parezca a la ficha de SmartOLT. Ese archivo es **área de OpenCode** (estructura/modales),
> por eso esta tarea es tuya. Claude NO lo va a tocar.

## Estado / cómo activar los datos en dev
- Flags en `/mnt/.../backend/.env` (ya activados en dev): `ENRICH_WAN=true`, `ENRICH_SP=true`.
- El job corre cada 60s pero solo re-enriquece ONUs `enriched_at` null o > `ENRICH_STALE_DAYS` (7d).
  Para ver datos YA: forzar por OLT con el path de enrich por OLT, o esperar a que se vuelvan stale.
  En dev hay varias ONUs de **Itelsa-Mocoreta** ya enriquecidas con todos los campos (probar con esas).
- Ojo: `download_mbps`/`upload_mbps` salen del PIR del traffic-table y quedan **~5% por encima** del
  nominal (Huawei). **Mostrá el NOMBRE del perfil** (`download_profile`, ej. `SMARTOLT-40M-DOWN`) como
  dato principal; el Mbps es secundario/aproximado.

## Campos nuevos disponibles en el modelo `ONT` (Prisma) — ya en la DB
El endpoint de detalle de ONU (findUnique de Prisma) ya devuelve estos escalares/JSON. Si tu endpoint
usa un `select` explícito, **agregalos** (si no, ya vienen todos).

### 🟡 GRUPO GRATIS (siempre presentes tras enrich)
| Campo DB | Tipo | Qué es |
|---|---|---|
| `temperature` | Float | Temp de la ONU (°C) |
| `cpu_pct` | Int | % CPU de la ONU |
| `mem_pct` | Int | % memoria de la ONU |
| `tr069_enabled` | Boolean | TR069 management Enable/Disable |
| `tr069_ip_index` | Int | TR069 IP index |
| `online_duration` | String | Ej. "17 day(s), 3 hour(s)..." |
| `last_up` | DateTime | Última vez que subió |
| `last_down` | DateTime | Última vez que cayó |
| `ports` | Json | Inventario `{pots,eth,vdsl,tdm,moca,catv}` (cantidad de puertos) |
| `mgmt_ip` | String | IP de gestión (puede ser null) |

### 🔴 GRUPO WAN
| Campo DB | Tipo | Qué es |
|---|---|---|
| `ip_address` | String | IP WAN (IPv4) |
| `mac` | String | MAC (formato `xx:xx:xx:xx:xx:xx`) |
| `wan_mode` | String | Connection type (IP routed / bridged) |
| `wan_ip_source` | String | Static / DHCP / PPPoE |
| `wan_encap` | String | IPoE / PPPoE |
| `wan_mask` | String | Máscara de subred |
| `wan_gateway` | String | Gateway |
| `wan_vlan` | Int | Manage VLAN de la WAN |
| `pppoe_user` | String | Usuario PPPoE (si aplica) |
| `wan_info` | Json | **Array** de todas las WAN: `[{index,name,service_type,connection_type,ipv4_status,ipv4_access,ipv4_address,mask,gateway,manage_vlan,mac,encap,pppoe_user}]` |

### 🔴 GRUPO service-port + eth-port
| Campo DB | Tipo | Qué es |
|---|---|---|
| `vlan` | Int | VLAN de servicio real (recién ahora se puebla) |
| `gem` | Int | GEM index |
| `service_port_id` | Int | ID del service-port |
| `download_profile` | String | **Nombre** del perfil de bajada (ej. `SMARTOLT-40M-DOWN`) ← mostrar este |
| `upload_profile` | String | **Nombre** del perfil de subida (ej. `SMARTOLT-20M-UP`) ← mostrar este |
| `download_mbps` | Int | Bajada aprox. en Mbps (≈ +5% del nominal) |
| `upload_mbps` | Int | Subida aprox. en Mbps |
| `service_ports` | Json | Array de service-ports `[{service_port_id,vlan,vlan_attr,gem,flow_type,tt_rx,tt_tx,sp_state}]` |
| `eth_ports` | Json | Array de puertos eth `[{port,type(GE/FE),speed(Mbps o null),duplex,link(up/down),ring}]` |

### 📺 TV — CATV (RF) vs IPTV (multicast) — ¡son servicios DISTINTOS!
> **CATV** = la ONT tiene **puerto RF** (señal de TV por coaxial). **IPTV** = la ONT maneja
> **multicast** (TV por IP). Una ONT puede tener uno, otro, ambos o ninguno. Mostrarlos separados.

| Campo DB | Tipo | Qué es |
|---|---|---|
| `has_catv` | Boolean | La ONT tiene puerto RF activo (servicio CATV) |
| `catv_ports` | Json | `[{port, link(up/down), tx_power_dbmv(número o null)}]` — potencia RF en dBmV |
| `has_iptv` | Boolean | La ONT maneja multicast (servicio IPTV) |
| `iptv_vlan` | Int | VLAN multicast (si aplica) |

> Detección: `has_catv` sale de `display ont port state ... catv-port all` (solo se sondea en OLTs
> con `iptv_enabled=true`, gated por `ENRICH_CATV`). `has_iptv`/`iptv_vlan` salen GRATIS de los
> campos Multicast/IGMP de `display ont info`. Algunas ONUs RF (ej. Broadcom GP1704) reportan
> `tx_power_dbmv: null` (no dan lectura de potencia) — mostrar "up" igual.

## Layout sugerido (clonar secciones de la ficha de SmartOLT)
1. **Datos generales** (ya existe): sumar **ONU type/modelo, firmware, sw_version, perfiles
   line/service, distancia** (ya venían de FASE 1) + **mgmt IP, ONU mode (configuration_method),
   TR069 (badge Enable/Disable)**.
2. **Estado/salud** (nuevo card): temperatura, CPU%, memoria%, online duration, last up/down.
3. **WAN** (nuevo card o tabla): por cada item de `wan_info` → Name, Service type, Connection type,
   IPv4 status, access type, IP/máscara/gateway, Manage VLAN, MAC, encap, PPPoE user.
4. **Velocidades / VLAN** (nuevo): VLAN, `download_profile` (+ `download_mbps` chico al lado),
   `upload_profile` (+ `upload_mbps`).
5. **Puertos Ethernet** (tabla, de `eth_ports`): Port | Tipo | Speed | Duplex | LinkState (badge
   verde up / gris down) | Ring. Para el inventario de puertos usar `ports` (cuántos POTS/ETH/CATV).

## Reglas de colaboración (COLLAB.md)
- `frontend/src/pages/ONUView/*` es COMPARTIDO; vos hacés estructura/modales, los campos de
  enriquecimiento son estos. Tocalo en una pasada, commiteá por nombre y actualizá tu fila del tablón.
- Si tu endpoint de detalle de ONU hace `select` en Prisma, agregá los campos de arriba. Si querés
  un endpoint dedicado de "refrescar enriquecimiento on-demand" para esta ficha, avisá: lo podemos
  cablear contra el path de enrich por OLT/ONU del backend (no lo agregué para no pisar tus cambios
  sin commitear en `routes/onts.js` / `ontController.js`).

## Referencia
Backend e2e validado en: `docs/ENRIQUECIMIENTO_ONU_FASE2.md`. Parsers y tests en
`backend/src/services/huawei/` (14 tests verdes, fixtures reales sanitizados).
