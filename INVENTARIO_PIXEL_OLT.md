# INVENTARIO PIXEL STUDIOS OLT

## Arquitectura General

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 + Zustand 4 + TanStack Query 5 |
| Backend | Node.js 20 + Express.js |
| Base de datos | PostgreSQL 16 + TimescaleDB |
| Cache/Jobs | Redis 7 + Bull |
| Real-time | Socket.io 4.6 |
| Auth | JWT (15m) + refresh tokens (7d) + remember me (30d) + RBAC (admin/noc/readonly) |
| OLT Protocols | SNMP v2c · Telnet · SSH · TR-069 CWMP |

## Estructura del Backend

### Routas montadas (`app.js`)
| Prefix | Archivo | Endpoints |
|--------|---------|-----------|
| `/api/v1/auth` | `routes/auth.js` | login, refresh, logout, me, users CRUD |
| `/api/v1/olts` | `routes/olts.js` | list, create, get, update, delete, status, ports, portONTs, scan, enrich, save-config, compare, compare/fix, command, config |
| `/api/v1/onts` | `routes/onts.js` | list, create, get, update, patch, delete, signal, signal/history, reboot, location, dhcp-leases, mac-table, provision, wan-config + 24 ONU actions + unconfigured, saved, authorize, batch |
| `/api/v1/alerts` | `routes/alerts.js` | list, create, get, acknowledge, resolve, delete |
| `/api/v1/clients` | `routes/clients.js` | list, create, get, update, delete |
| `/api/v1/dashboard` | `routes/dashboard.js` | summary, network-health, pon-outage, network-status, authorizations-per-day, signal-degradation, activity-feed |
| `/api/v1/reports` | `routes/reports.js` | tasks, authorizations, export-data, import, signal-summary |
| `/api/v1/ztp` | `routes/ztp.js` | pending, authorize, profiles |
| `/api/v1/tr069` | `routes/tr069.js` | devices, device, vpn-tunnels CRUD, profiles CRUD |
| `/api/v1/notifications` | `routes/notifications.js` | list, create, update, delete |
| `/api/v1/map` | `routes/map.js` | (OLT/ONT geo data) |
| `/api/v1/dhcp` | `routes/dhcp.js` | DHCP leases |
| `/api/v1/gps` | `routes/gps.js` | GPS coordinates |
| `/api/v1/vlan` | `routes/vlan.js` | get/set VLAN config |
| `/api/v1/speed-profiles` | `routes/speedProfiles.js` | list, create, update, delete, apply |
| `/api/v1/graphs` | `routes/graphs.js` | olt-stats, pon-signal, signal, signal-ont, traffic, uplink |
| `/api/v1/diagnostics` | `routes/diagnostics.js` | signal diagnostics |
| `/api/v1/zones` | `routes/inventory.js` (zones) | list, create, update, delete |
| `/api/v1/odbs` | `routes/inventory.js` (odbs) | list, create, update, delete |
| `/api/v1/onu-types` | `routes/inventory.js` (onuTypes) | list, create, update, delete |
| `/api/v1/auth-presets` | `routes/inventory.js` (authPresets) | list, create, update, delete |
| `/api/v1/auto-action-presets` | `routes/autoActions.js` | list, create, update, toggle, delete, run-now |
| `/api/v1/settings` | `routes/settings.js` | signal-thresholds, billing |
| `/api/v1/api-keys` | `routes/apiKeys.js` | list, create, regenerate, delete |
| `/api/v1/vsol` | `routes/vsol.routes.js` | ports, port-onus, onu-detail, onu-optical, onu-stats, onu-eth, add-onu, activate, deactivate, reboot, delete, set-description, profiles, config, autofind, batch |

### Jobs (Bull + Redis)
| Job | Intervalo | Función |
|-----|-----------|---------|
| `pollOLTs` | 60s | CPU, temp, uptime → OLTHistory |
| `signalHistory` | 5m | RX/TX → SignalHistory |
| `alertEngine` | 15s | Thresholds → alerts |
| `trafficPoll` | ? | Traffic stats |
| `enrichOnts` | on-demand | Model/firmware/profile/… per ONT |
| `autoAuthorize` | configurable | Auto-provision ONUs |
| `batchOperation` | on-demand | Batch ONU actions |

### OLT Adapters
| Adapter | Protocolo | Estado |
|---------|-----------|--------|
| Huawei MA5800 (ma5800.js) | SNMP + Telnet | ✅ 27 action methods |
| Huawei MA5680T (ma5680t.js) | SNMP + Telnet | ✅ Legacy support |
| Huawei SNMP (snmpHuawei.js) | SNMP v2c | ✅ |
| Huawei Telnet (telnetHuawei.js) | Telnet CLI | ✅ |
| VSOL (vsol.js) | SSH/Telnet | ✅ 27 actions |
| VSOL SNMP (snmpVsol.js) | SNMP | ✅ |
| VSOL Telnet (telnetVsol.js) | Telnet | ✅ |
| KingType (kingtype.js) | SNMP | ✅ 27 stubs |
| KingType SNMP (snmpKingtype.js) | SNMP | ✅ |

### Modelos de Datos (Prisma) — 25 modelos
OLT, OLTHistory, PONPort, ONT, Client, Alert, SignalHistory, TR069Device, ServiceProfile, ZTPProfile, NotificationConfig, SpeedProfile, NAPBox, DHCPLease, AuditLog, NetStatusHistory, AutoActionPreset, AuthorizationPreset, SignalThresholdConfig, ApiKey, OltSubscription, User, SavedOnu, OltTrafficHistory, Zone, OnuType, VpnTunnel, Tr069Profile, VsolProfile, VsolAlert, VsolEventLog, VsolConfigBackup

## Estructura del Frontend

### Páginas (32 rutas)
| Ruta | Componente | Estado |
|------|-----------|--------|
| `/login` | Login | ✅ |
| `/dashboard` | Dashboard | ✅ |
| `/olts` | OLTs | ✅ |
| `/olts/new` | OLTNew | ✅ |
| `/olts/:id/config` | OLTConfig | ✅ |
| `/olts/:id/vsol` | VSOLDashboard | ✅ |
| `/olts/:id/vsol/onu-list/:ponIndex` | OnuList | ✅ |
| `/olts/:id/vsol/onu/:ponIndex/:onuId` | OnuView | ✅ |
| `/olts/:id/vsol/profiles` | Profiles | ✅ |
| `/olts/:id/vsol/autofind` | Autofind | ✅ |
| `/olts/:id/vsol/batch` | Batch | ✅ |
| `/onts` | ONTs | ✅ (~90% parity) |
| `/onu/:id` | ONUView | ✅ (~90% parity) |
| `/clients` | Clients | ✅ |
| `/tr069` | TR069 | ✅ |
| `/alerts` | Alerts | ✅ |
| `/events` | Events | ⚠️ (mock data) |
| `/speed-profiles` | SpeedProfiles | ✅ |
| `/reports/tasks` | ReportsTasks | ✅ |
| `/reports/authorizations` | ReportsAuthorizations | ✅ |
| `/reports/export` | ReportsExport | ✅ |
| `/reports/import` | ReportsImport | ✅ |
| `/settings` | Settings | ✅ (7 tabs) |
| `/users` | Users | ✅ |
| `/diagnostics` | Diagnostics | ✅ |
| `/graphs` | Graphs | ✅ |
| `/map` | MapView | ✅ |
| `/zones` | Zones | ✅ |
| `/odbs` | ODBs | ✅ |
| `/onu-types` | OnuTypes | ✅ |
| `/auth-presets` | AuthPresets | ✅ |
| `/config-comparison` | ConfigComparison | ✅ |
| `/unconfigured` | Unconfigured | ✅ |
| `/authorize-onu` | AuthorizeONU | ✅ |

### API Service Layer — 90+ funciones
| Módulo | Funciones | Estado |
|--------|-----------|--------|
| `oltAPI` | 17 | ✅ |
| `ontAPI` | 33 | ✅ |
| `alertAPI` | 4 | ✅ |
| `clientAPI` | 4 | ✅ |
| `dashboardAPI` | 7 | ✅ |
| `tr069API` | 2 | ✅ |
| `tr069API2` | 6 | ✅ |
| `vsolAPI` | 16 | ✅ |
| `ztpAPI` | 3 | ✅ |
| `zoneAPI` | 4 | ✅ |
| `odbAPI` | 4 | ✅ |
| `onuTypeAPI` | 4 | ✅ |
| `authPresetAPI` | 4 | ✅ |
| `speedProfileAPI` | 4 | ✅ |
| `authAPI` | 4 | ✅ |
| `apiKeyAPI` | 4 | ✅ |
| `settingsAPI` | 4 | ✅ |
| `autoActionAPI` | 6 | ✅ |
| `graphsAPI` | 6 | ✅ |
| `reportsAPI` | 4 | ✅ |

### Stores (Zustand)
- authStore: user, token, setAuth, clearAuth (localStorage persist)
- oltStore: olts[], selectedOLT
- ontStore: onts[], pendingZTP[], selectedONT
- alertStore: activeAlerts[], alertCount, criticalCount
- uiStore: sidebar, drawers, filters

### Hooks
- useOLTs, useOLT, useOLTStatus, useCreateOLT, useUpdateOLT, useDeleteOLT, useSendOLTCommand
- useONTs, useONT, useRebootONT, useUpdateONTLocation, useDHCPLeases
- useAlerts, useActiveAlerts, useAcknowledgeAlert, useResolveAlert
- useSignalHistory, useCurrentSignal
- useWebSocket
- useTheme
