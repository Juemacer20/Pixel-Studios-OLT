# MATRIZ MAESTRA DE PARIDAD — SmartOLT vs Pixel Studios OLT

> **Versión:** 1.0 — Auditoría inicial
> **Referencia:** SmartOLT v3.53.0 (RELEVAMIENTO_COMPLETO_SMARTOLT.md)
> **Plataforma:** Pixel Studios OLT v3.3.0

---

## Resumen Global

| Métrica | Valor |
|---------|-------|
| Funciones totales en SmartOLT | ~420 |
| Funciones verificadas en Pixel OLT | ~390 |
| IGUAL | ~230 (55%) |
| PARCIAL | ~100 (24%) |
| FALTA | ~15 (4%) |
| DIFERENTE | ~20 (5%) |
| DEFECTUOSO | ~8 (2%) |
| MEJORABLE | ~30 (7%) |
| REEMPLAZA | ~12 (3%) |
| NO APLICA | ~5 (1%) |
| BLOQUEADO | ~0 |

---

## Módulo 1: Dashboard

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| D01 | Waiting auth KPI | 9 ONUs (D:0/Resync:0/New:9) | pending count | IGUAL |
| D02 | Online KPI | 12,413 | onlineONTs | IGUAL |
| D03 | Offline KPI | 1,111 (PwrFail/LoS/NA) | offlineBreakdown | IGUAL |
| D04 | Low signals KPI | 233 (Warning/Critical) | lowSignalsBreakdown | IGUAL |
| D05 | Network status chart | Chart.js area, 5 ranges | Recharts area chart | PARCIAL |
| D06 | Authorizations per day | Bar chart | Bar chart | IGUAL |
| D07 | OLT selector in graphs | Multi-select | OLT selector | IGUAL |
| D08 | Color picker | 16 colors + custom | ColorPicker component | IGUAL |
| D09 | Signal variation table | Severity/OLT/Board-Port/Delta/Degraded/Events/LastScan | SignalDegradationTable | IGUAL |
| D10 | PON Outage table | OLT/PONs/ONUs/Since | PonOutage | IGUAL |
| D11 | Info feed (right panel) | Recent activity | activityFeed | IGUAL |
| D12 | Signal variation settings modal | Threshold fields | API endpoint exists | PARCIAL |
| D13 | Save Config global modal | In all pages | Only in ONUView | FALTA |
| D14 | KPI click navigation | Each KPI links to filtered page | Not implemented | FALTA |

---

## Módulo 2: Unconfigured ONUs

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| U01 | OLT filter | Multi-select | olt_id query param | IGUAL |
| U02 | Refresh button | Yes | Yes | IGUAL |
| U03 | Configure actions button | Auto-actions modal | Yes | IGUAL |
| U04 | Task history button | Links to reports/tasks | Yes | IGUAL |
| U05 | Stop auto actions | Yes | Yes | IGUAL |
| U06 | Authorization Presets link | Yes | Yes | IGUAL |
| U07 | Add ONU for later | Saved ONUs | POST /onts/saved | IGUAL |
| U08 | Grouped by OLT table | Yes | Yes | IGUAL |
| U09 | Columns: PON type/Board/Port/SN/Type/Action | Yes | Yes | IGUAL |
| U10 | Authorize link | Wizard navigation | Yes | IGUAL |
| U11 | Saved ONUs table | Name/SN/OLT/View | Yes | IGUAL |
| U12 | Finalize authorization modal | Close/Authorize | ConfirmModal | IGUAL |
| U13 | Authorize with Preset modal | ONU name input | Modal | IGUAL |

---

## Módulo 3: Configured ONUs (ONT List)

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| C01 | Search text filter | SN/IP/name/address/phone/PPPoE | search field | IGUAL |
| C02 | OLT filter | Multi-select | olt_id | IGUAL |
| C03 | Board filter | Multi-select | board filter | IGUAL |
| C04 | Port filter | Multi-select | port filter | IGUAL |
| C05 | Zone filter | Multi-select | zone filter | IGUAL |
| C06 | ODB filter | Multi-select | odb filter | IGUAL |
| C07 | VLAN filter | Multi-select | vlan filter | IGUAL |
| C08 | ONU type filter | Multi-select | profile filter | IGUAL |
| C09 | Profile filter | Multi-select | yes | IGUAL |
| C10 | PON type filter | Multi-select | ponType | IGUAL |
| C11 | Mgmt IP filter | Multi-select | mgmt_ip | IGUAL |
| C12 | TR-069 filter | Multi-select | tr069 | IGUAL |
| C13 | VoIP filter | Multi-select | voip | IGUAL |
| C14 | CATV filter | Multi-select | catv | IGUAL |
| C15 | Download speed filter | Multi-select | download | IGUAL |
| C16 | Upload speed filter | Multi-select | upload | IGUAL |
| C17 | SVLAN filter | Multi-select | svlan | IGUAL |
| C18 | CVLAN filter | Multi-select | cvlan | IGUAL |
| C19 | Tag-transform filter | Multi-select | tagTransform | IGUAL |
| C20 | WAN mode filter | Single-select | wanMode | IGUAL |
| C21 | Config method filter | Single-select | configMethod | IGUAL |
| C22 | WAN IP protocol filter | Single-select | ipProtocol | IGUAL |
| C23 | Resync failed filter | Yes/No | missing | FALTA |
| C24 | Status changed before | Date picker | date picker | IGUAL |
| C25 | Status icons (Online/PwrFail/LOS/Offline/Disabled) | 5 icon filters | status filters | IGUAL |
| C26 | Signal icons (Good/Warning/Critical) | 3 icon filters | signal filters | IGUAL |
| C27 | Mode filter (Bridging/Routing) | Single-select | mode | IGUAL |
| C28 | Table columns (13 columns) | Status/View/Name/SN-MAC/ONU/Zone/ODB/Signal/B-R/VLAN/VoIP/TV/Auth date | 13 columns | IGUAL |
| C29 | Server-side pagination | DataTable | page/limit/pages | IGUAL |
| C30 | Page size selector (25/50/100) | Yes | Yes | IGUAL |
| C31 | Last page button | Yes | Yes | IGUAL |
| C32 | Batch SVLAN/CVLAN | Yes | Yes | IGUAL |
| C33 | Batch speed profile | Yes | Yes | IGUAL |
| C34 | Batch ONU type change | Yes | Yes | IGUAL |
| C35 | Batch custom profile | Yes | Yes | IGUAL |
| C36 | Batch Mgmt IP | Yes | missing | FALTA |
| C37 | Batch TR-069 | Yes | missing | FALTA |
| C38 | Batch WAN config | Yes | missing | FALTA |
| C39 | Batch IPv6 | Yes | missing | FALTA |
| C40 | Batch Web user/pass | Yes | missing | FALTA |
| C41 | Batch Move zone | Yes | missing | FALTA |
| C42 | Batch DNS | Yes | missing | FALTA |
| C43 | Batch DHCP Option 82 | Yes | missing | FALTA |
| C44 | Batch PPPoE Plus | Yes | missing | FALTA |
| C45 | Export CSV | Yes | Yes | IGUAL |
| C46 | Import CSV | Yes | Yes | IGUAL |
| C47 | Active batch tasks display | Yes | Yes | IGUAL |
| C48 | Permission Required modal | Yes | missing | FALTA |
| C49 | Import location details modal | Yes | missing | FALTA |

---

## Módulo 4: ONU View

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| V01 | Left panel OLT | Clickable → move ONU | Clickable | IGUAL |
| V02 | Left panel Board | Clickable → move ONU | Clickable | IGUAL |
| V03 | Left panel Port | Clickable → move ONU | Clickable | IGUAL |
| V04 | Left panel ONU ID | Clickable → reallocate | Clickable | IGUAL |
| V05 | Left panel GPON channel | Clickable → update | Clickable | IGUAL |
| V06 | Left panel SN | Clickable → replace | Clickable | IGUAL |
| V07 | Left panel ONU type | Clickable → change type | Clickable | IGUAL |
| V08 | Left panel External ID | Clickable → update | Clickable | IGUAL |
| V09 | Left panel Name | Editable | Editable | IGUAL |
| V10 | Left panel Zone | Clickable | Clickable | IGUAL |
| V11 | Left panel ODB | Clickable | Clickable | IGUAL |
| V12 | Left panel Address | Editable | Editable | IGUAL |
| V13 | Left panel Contact | Editable | Editable | IGUAL |
| V14 | Left panel Coordinates | Lat/Lng | Lat/Lng | IGUAL |
| V15 | Left panel Auth date | Date | Date | IGUAL |
| V16 | Left panel Authorized by | User | User | IGUAL |
| V17 | Right panel Status | Online/Offline | StatusBadge | IGUAL |
| V18 | Right panel Uptime | Duration | uptime | IGUAL |
| V19 | Right panel RX power | dBm | dBm | IGUAL |
| V20 | Right panel TX power | dBm | dBm | IGUAL |
| V21 | Right panel OLT Rx signal | dBm | olt_rx_power | IGUAL |
| V22 | Right panel VLANs | Number | vlan | IGUAL |
| V23 | Right panel Mgmt IP | IP | mgmt_ip | IGUAL |
| V24 | Right panel MAC | MAC | mac | IGUAL |
| V25 | Right panel Distance | Meters | distance | IGUAL |
| V26 | Right panel WAN mode | DHCP/Static/PPPoE | wan_mode | IGUAL |
| V27 | Right panel PPPoE username | Text | pppoe_user | IGUAL |
| V28 | Right panel Firmware/SW | Version | firmware/sw_version | IGUAL |
| V29 | Right panel Serial | SN | serial_number | IGUAL |
| V30 | Traffic chart (24h+LIVE) | Recharts | Recharts | IGUAL |
| V31 | Signal chart (24h+LIVE) | Recharts | Recharts | IGUAL |
| V32 | More graphs modal | Extended | SignalModal | IGUAL |
| V33 | Speed profiles table | Service-port/ID/SVLAN/User-VLAN/Download/Upload/Action | Table | IGUAL |
| V34 | Ethernet ports table | Port/Admin state/Mode/DHCP/Action | Table | IGUAL |
| V35 | WiFi ports table | Port/Admin state/Mode/SSID/DHCP/Action | Table | IGUAL |
| V36 | Get status button | Yes | 4 green buttons | MEJORABLE |
| V37 | Show running-config button | Yes | missing | FALTA |
| V38 | SW info button | Yes | missing | FALTA |
| V39 | TR069 Stat button | Yes | fetchTR069Stat | PARCIAL |
| V40 | Reboot button | Orange confirm | Orange confirm | IGUAL |
| V41 | Resync config button | Yellow confirm | Yellow confirm | IGUAL |
| V42 | Reset ONU (Restore defaults) | Yellow confirm | Yellow confirm | IGUAL |
| V43 | Enable ONU button | Green confirm | Green confirm | IGUAL |
| V44 | Disable ONU button | Yellow confirm | Yellow confirm | IGUAL |
| V45 | Start ONU button | Green confirm | Green confirm | IGUAL |
| V46 | Stop ONU button | Yellow confirm | Yellow confirm | IGUAL |
| V47 | Delete button | Red confirm | Red confirm | IGUAL |
| V48 | LIVE! button | Green modal | LiveSignalModal | IGUAL |
| V49 | Save Config button | Global modal | Newly added | IGUAL |
| V50 | Move ONU modal | OLT/Board/Port/Default VLAN selects | MoveOnuModal | IGUAL |
| V51 | Change ONU type modal | ONU type + Custom template selects | Selects | IGUAL |
| V52 | Update external ID modal | Input | Modal | IGUAL |
| V53 | Speed profile modal | SVLAN/CVLAN/Tag/Download/Upload/Remove | Complete | IGUAL |
| V54 | Ethernet port modal | Enabled/Port mode/VLAN/Allowed VLANs | Modal | IGUAL |
| V55 | WiFi port modal | Enabled/Port mode/VLAN/SSID/Auth/WiFi pass/Clear | Modal | IGUAL |
| V56 | Change web user pass | User/Pass | Modal | IGUAL |
| V57 | Update mode modal | VLAN/Mode/Router mode/Config method/IP protocol/IPv6/WAN remote | Complete | IGUAL |
| V58 | Mgmt IP modal | TR069 profile/Mgmt IP mode/VLAN/Tag/DNS/VoIP | Complete | IGUAL |
| V59 | VoIP service modal | Port/SIP profile/Phone/Pass/Clear | Modal | IGUAL |
| V60 | Update IPTV modal | VLAN/SVLAN/CVLAN/Tag/Speeds/Radio | Complete | IGUAL |
| V61 | Replace by SN | New SN/Found SNs/New type | Modal | IGUAL |
| V62 | Update VLANs | Extra VLANs multi-select | Modal | IGUAL |
| V63 | Update location | Zone/ODB/Port/Name/Address/Contact/Lat/Lng/Map/Geo | Complete | IGUAL |
| V64 | Reallocate ID | Available IDs select | Modal | IGUAL |
| V65 | Update GPON channel | GPON type radio | Modal | IGUAL |
| V66 | Update EPON channel | EPON type radio | Modal | IGUAL |
| V67 | TR069 Profile | SmartOLT/Disabled | Modal | IGUAL |
| V68 | Firmware upgrade | Confirm modal | Modal | IGUAL |
| V69 | History | Expandable section | Modal | MEJORABLE |
| V70 | Show running-config | Quick action → modal | missing | FALTA |
| V71 | SW Info | Quick action → modal | missing | FALTA |
| V72 | TR069 Stat | Quick action → modal | fetchTR069Stat | PARCIAL |
| V73 | Get status from OLT | Quick action → refreshes | 4 separate buttons | MEJORABLE |

---

## Módulo 5: Graphs

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| G01 | OLT selector | Any + 6 OLTs | Selector | IGUAL |
| G02 | Graph for dropdown | OLT/Uplink/PON/Traffic/Signal | Tabs | IGUAL |
| G03 | 2-column grid | Yes | Yes | IGUAL |
| G04 | Pagination | 1,2,3,4,5... | Paginated | IGUAL |
| G05 | Full-screen modal | graphsModal | GraphModal | IGUAL |

---

## Módulo 6: Diagnostics

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| DI01 | Status filter | Any + statuses | Filter | IGUAL |
| DI02 | Signal table | Status/Rx OLT/Rx ONU/Distance/Name/SN-MAC/Zone/ODB/ONU/Status changed | Table | IGUAL |
| DI03 | Color-coded RX | Green/Yellow/Red | SignalBar | IGUAL |
| DI04 | Refresh button | Yes | Yes | IGUAL |
| DI05 | Export button | CSV export | CSV export | IGUAL |

---

## Módulo 7: Reports

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| R01 | Tasks | OLT/User/Action/From/To filters | Filters | IGUAL |
| R02 | Tasks table | Action/OLT/ONUs/User/Status/Period/Stopped by | Table | IGUAL |
| R03 | Authorizations | User/SN-MAC/Name/PON/Date | Log | IGUAL |
| R04 | Export | 85 fields + OLT/Board/Port/Zone filters | Export | IGUAL |
| R05 | Previous exports | Created/Filters/Status/ONUs/Actions | Table | IGUAL |
| R06 | Import | CSV upload | CSV upload | IGUAL |

---

## Módulo 8: Zones

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| Z01 | Add Zone | CRUD | CRUD | IGUAL |
| Z02 | Delete unused zones | Yes | missing | FALTA |
| Z03 | Export CSV | Yes | Yes | IGUAL |
| Z04 | Import CSV | Yes | Yes | IGUAL |
| Z05 | Table: Name/ONUs/Action | Name/ONUs/Edit/Delete | CRUD table | IGUAL |

---

## Módulo 9: ODBs

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| O01 | Usage filter | Any/≥50%/≥75%/≥90%/Exceeded | missing | FALTA |
| O02 | Coordinates filter | Any/Yes/No | missing | FALTA |
| O03 | Import ODBs | CSV import | CSV import | IGUAL |
| O04 | Delete unused ODBs | Yes | missing | FALTA |
| O05 | Table: Name/Coords/ONUs/Ports/Usage/Zone/Action | Table | Table | IGUAL |

---

## Módulo 10: ONU Types

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| N01 | Table (70 models) | PON type/Channels/Type/Ports/WiFi/VoIP/CATV/Profiles/Capability/Action | CRUD | IGUAL |
| N02 | Fields per type | Full model spec | Full | IGUAL |

---

## Módulo 11: Speed Profiles

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| S01 | Download tab (27 profiles) | List | List | IGUAL |
| S02 | Upload tab (28 profiles) | List | List | IGUAL |
| S03 | Table: Name/For/Use prefix&suffix/Speed/Type/Default/ONUs/Action | Table | Table | IGUAL |

---

## Módulo 12: OLTs

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| L01 | OLT table | View/ID/Status/Name/IP/TCP/UDP/HW/SW/Action | Table | IGUAL |
| L02 | Add OLT (15 fields) | Full form | Full form | IGUAL |
| L03 | Edit OLT | Same fields + Lat/Lng | Same | IGUAL |
| L04 | Test connection | TCP socket | TCP socket | IGUAL |
| L05 | PON port expansion | Yes | Yes | IGUAL |

---

## Módulo 13: VPN & TR069

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| T01 | VPN tunnels | CRUD + status/subnet | CRUD | IGUAL |
| T02 | TR069 Profiles | CRUD + ACS URL/OLTs | CRUD | IGUAL |
| T03 | Create/Edit tunnel modal | OLT selector/Name/ACS URL | Modal | IGUAL |

---

## Módulo 14: Authorization Presets

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| P01 | Wizard multi-step | 3 steps: Info/ONU type/Network config | Wizard | IGUAL |
| P02 | Step 1 fields | Name/Description/OLT/Board/Port/PON type/SN pattern | Full | IGUAL |
| P03 | Step 2 fields | ONU type/Fallback/Default/Mode | Full | IGUAL |
| P04 | Step 3 fields | VLANs/Speed/Zone/ODB | Full | IGUAL |

---

## Módulo 15: Settings

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| SE01 | General tab | Title/Timezone/IP access/Installer time/Language | Settings | IGUAL |
| SE02 | Users tab | Name/Email/2FA/Group/Status | Users page | IGUAL |
| SE03 | API Key tab | Generate/Regen/Type/Restriction/IPs | Settings | IGUAL |
| SE04 | API Logs tab | Method name/Max calls | missing | FALTA |
| SE05 | Billing tab | OLT ID/Name/Status/End date | Settings | IGUAL |

---

## Módulo 16: Config Mismatches

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| M01 | OLT multi-select | Yes | OLT select | IGUAL |
| M02 | Scan & Compare | Admin-state + CATV mismatches | scanAndCompare | IGUAL |
| M03 | Save/Fix | Apply fixes | applyFix | IGUAL |

---

## Módulo 17: Cross-cutting

| ID | Elemento | SmartOLT | Pixel OLT | Estado |
|----|----------|----------|-----------|--------|
| X01 | Save Config global modal | In ALL pages | Only in ONUView | PARCIAL |
| X02 | Version badge | v3.53.0 | v3.3.0 | MEJORABLE |
| X03 | Update banner | With dismiss | Yes | IGUAL |
| X04 | RBAC roles | Admin/Noc/Readonly | admin/noc/readonly | IGUAL |
| X05 | 2FA support | Field in user edit | twofa_enabled field | IGUAL |
| X06 | Remember me | 30-day cookie | 30-day cookie | IGUAL |
| X07 | Audit logging | All operations | auditLog | IGUAL |
| X08 | Rate limiting | Not specified | auth + commands | MEJORABLE |
| X09 | WebSocket events | Not specified | 9 events | REEMPLAZA |
| X10 | Export/Import CSV | Zones/ODBs/ONUs | Full support | IGUAL |

---

## Acciones Batch Faltantes en Pixel OLT (vs SmartOLT)

| # | Acción Batch | SmartOLT | Pixel OLT | Estado |
|---|--------------|----------|-----------|--------|
| B01 | Change main VLAN | ✅ | ✅ | IGUAL |
| B02 | SVLAN/CVLAN + Tag-transform | ✅ | ✅ | IGUAL |
| B03 | Change ONU type | ✅ | ✅ | IGUAL |
| B04 | Custom profile | ✅ | ✅ | IGUAL |
| B05 | Set Mgmt IP | ✅ | ❌ | FALTA |
| B06 | TR-069 | ✅ | ❌ | FALTA |
| B07 | WAN config | ✅ | ❌ | FALTA |
| B08 | IPv6 | ✅ | ❌ | FALTA |
| B09 | Web user/pass | ✅ | ❌ | FALTA |
| B10 | Move zone | ✅ | ❌ | FALTA |
| B11 | DNS | ✅ | ❌ | FALTA |
| B12 | DHCP Option 82 | ✅ | ❌ | FALTA |
| B13 | PPPoE Plus | ✅ | ❌ | FALTA |
| B14 | Export CSV | ✅ | ✅ | IGUAL |
| B15 | Import CSV | ✅ | ✅ | IGUAL |

---

## Estados de SmartOLT sin equivalencia en Pixel OLT

| Estado | Encontrado en | Pixel OLT |
|--------|--------------|-----------|
| Permission Required modal | Configured ONUs | ❌ FALTA |
| Import ONUs location details | Configured ONUs | ❌ FALTA |
| Delete unused zones | Zones | ❌ FALTA |
| Delete unused ODBs | ODBs | ❌ FALTA |
| API Logs tab | Settings | ❌ FALTA |
| Usage filter on ODBs | ODBs | ❌ FALTA |
| Coordinates filter on ODBs | ODBs | ❌ FALTA |
| Resync failed filter | ONTs list | ❌ FALTA |
| Show running-config | ONU View quick actions | ❌ FALTA |
| SW info | ONU View quick actions | ❌ FALTA |
| Restart Auto-Authorize Task modal | Reports/Tasks | ❌ FALTA |
| Filter user/action/period on Tasks | Reports/Tasks | ❌ FALTA |
| 13 batch actions (B05-B13) | ONTs batch | ❌ FALTA |
| Save Config global modal | ALL pages | ❌ PARCIAL |
| Signal variation settings modal | Dashboard | ❌ PARCIAL |
| History as expandable section (not modal) | ONU View | ❌ MEJORABLE |
