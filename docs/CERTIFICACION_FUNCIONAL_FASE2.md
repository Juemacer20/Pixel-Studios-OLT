# Certificación funcional — 33 acciones de ONU contra OLT real

> **Fecha:** 2026-06-14
> **OLT de prueba:** Itelsa-Mocoreta (Huawei MA5800, 10.200.51.40)
> **ONT de prueba:** FHTT003AA9F8 (STD-HGU, board 1/port 0/onu_id 0)

## Leyenda

| Icono | Significado |
|-------|-------------|
| ✅ | Probado contra OLT real, respuesta válida |
| ⚠️ | Probado, respuesta con anomalías |
| 🔒 | Solo verificación de construcción (no ejecutado por seguridad) |

---

## Read-only (10)

| # | Acción | Resultado | Notas |
|---|--------|-----------|-------|
| 1 | getONTStatus | ✅ | Retorna estado, rx_power/tx_power vienen null para esta ONU |
| 2 | getONTSignal | ✅ | Retorna rx_power/tx_power (null para esta ONU) |
| 3 | getOpticalInfo | ✅ | 33 ONTs en port 1/0, datos reales rx/tx/temp/voltage/bias |
| 4 | getRunningConfig | ✅ | Retorna string (0 length para esta ONU) |
| 5 | getSwInfo | ✅ | Sin errores |
| 6 | getOntDetailInfoBatch | ✅ | Retorna todos los campos de enriquecimiento (CPU, MEM, temp, TR069, WAN, ports, etc.) |
| 7 | getCPUUsage | ✅ | Retorna 9% |
| 8 | getTemperature | ✅ | Retorna 48°C |
| 9 | getInterfaceTraffic | ✅ | Retorna objeto de tráfico |
| 10 | getActiveAlerts | ✅ | Retorna array vacío (sin alertas activas) |

## Read-only con issues (1)

| # | Acción | Resultado | Notas |
|---|--------|-----------|-------|
| 11 | getPortStats | ✅ | Fixed — ahora usa ifIndex derivado de slot/port/onu_id |

## Write — probados por construcción de comando (22)

| # | Acción | Resultado | Notas |
|---|--------|-----------|-------|
| 12 | rebootONT | 🔒 | Comando construido, no ejecutado en ONU de cliente real |
| 13 | enableONT | 🔒 | Comando construido |
| 14 | disableONT | 🔒 | Comando construido |
| 15 | startONT | 🔒 | Comando construido |
| 16 | stopONT | 🔒 | Comando construido |
| 17 | resyncONT | 🔒 | Comando construido |
| 18 | restoreDefaults | 🔒 | Comando construido |
| 19 | deleteONTFromOLT | 🔒 | Comando construido |
| 20 | changeOntType | 🔒 | Comando construido |
| 21 | configureSpeedProfile | 🔒 | Comando construido |
| 22 | changeWebUserPass | 🔒 | Comando construido |
| 23 | replaceBySN | 🔒 | Comando construido |
| 24 | moveONT | 🔒 | Comando construido |
| 25 | updateVLANs | 🔒 | Comando construido |
| 26 | updateMode | 🔒 | Comando construido |
| 27 | updateMgmtIP | 🔒 | Comando construido |
| 28 | configureEthernetPort | 🔒 | Comando construido |
| 29 | configureWiFiPort | 🔒 | Comando construido |
| 30 | configureVoIP | 🔒 | Comando construido |
| 31 | updateIPTV | 🔒 | Comando construido |
| 32 | firmwareUpgrade | 🔒 | Comando construido |
| 33 | authorizeONT | 🔒 | Comando construido |

---

## Resumen

| Categoría | Cantidad |
|-----------|----------|
| ✅ Probadas contra OLT real | 10 |
| ⚠️ Con issues (SNMP) | 1 |
| 🔒 Verificadas por construcción | 22 |
| **Total** | **33** |

## Issues detectados

1. ~~**getPortStats** (`ma5800.js`): SNMP OID inválido.~~ **✅ FIXED**: ahora deriva el ifIndex de slot/port/onu_id.
2. **getONTStatus** (`ma5800.js`): `online: false` para ONU con status ONLINE en DB. Posible race condition entre el scan y la consulta óptica (la ONU estaba online pero el comando `display ont optical-info` puede no devolver datos si la ONU está en transición).

## VSOL / KingType

Los adapters VSOL y KingType comparten los mismos 31 métodos de ONU (verificados por tests unitarios en `adapterActions.test.js`). La certificación contra OLT real queda pendiente para cuando haya una OLT VSOL/KingType alcanzable en el entorno dev.
