# 🔧 PROMPT — Backend, API, Funcionalidades y Arquitectura
## Pixel Studios OLT · Prompt v1.0

---

## ROL

Sos un arquitecto de software senior especializado en sistemas de gestión de redes de telecomunicaciones (NMS/EMS), con experiencia profunda en protocolos SNMP, Telnet/SSH, GPON, y desarrollo de APIs REST en tiempo real para ISPs. Conocés a fondo el funcionamiento de OLTs Huawei (MA5800, MA5680T), KingType y VSOL, y cómo interactuar con ellas programáticamente.

---

## OBJETIVO

Desarrollá el **backend completo** de **Pixel Studios OLT**, una plataforma web de gestión y monitoreo de OLTs para ISPs. El sistema debe conectarse en tiempo real a los equipos de red, parsear sus datos, almacenarlos y exponerlos vía API REST + WebSocket al frontend.

---

## STACK TÉCNICO

- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Base de datos:** PostgreSQL 16 + extensión TimescaleDB (para series de tiempo de señal)
- **Cache / pub-sub:** Redis 7
- **SNMP:** net-snmp (librería Node.js)
- **Telnet/SSH:** ssh2 + node-telnet-client
- **WebSocket:** Socket.io
- **Autenticación:** JWT + refresh tokens
- **ORM:** Sequelize o Prisma (recomendás cuál y justificás)
- **Queue de jobs:** Bull (sobre Redis) para polling periódico
- **Logs:** Winston + Morgan
- **Variables de entorno:** dotenv
- **Contenerización:** Docker + docker-compose
- **Tests:** Jest

---

## ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────┐
│                  PIXEL STUDIOS OLT                   │
├──────────────┬──────────────────────────────────────┤
│   FRONTEND   │            BACKEND (Node.js)          │
│   React SPA  │  REST API + WebSocket (Socket.io)    │
├──────────────┼──────────────────────────────────────┤
│              │  ┌──────────┐  ┌──────────────────┐  │
│              │  │  Bull    │  │  OLT Adapter     │  │
│              │  │  Jobs    │──│  Layer           │  │
│              │  │  (Redis) │  │  (Huawei/KT/VSOL)│  │
│              │  └──────────┘  └──────────────────┘  │
│              │                        │              │
│              │  ┌─────────────────────▼────────┐    │
│              │  │  SNMP / Telnet / SSH clients │    │
│              │  └──────────────────────────────┘    │
│              │                        │              │
│              │  ┌─────────┐  ┌───────▼──────────┐  │
│              │  │  Redis  │  │   PostgreSQL      │  │
│              │  │  Cache  │  │ + TimescaleDB     │  │
│              │  └─────────┘  └──────────────────┘  │
└──────────────┴──────────────────────────────────────┘
```

---

## MÓDULOS A IMPLEMENTAR

### 1. OLT Adapter Layer (capa de abstracción de equipos)

Implementá una **fábrica de adaptadores** que normaliza la comunicación con cada fabricante:

```
OLTFactory.create(type: 'huawei' | 'kingtype' | 'vsol', config) → OLTAdapter
```

Cada adaptador implementa la interfaz:

```js
interface OLTAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  getSystemInfo(): Promise<SystemInfo>
  listONTs(ponPort: string): Promise<ONT[]>
  getONTSignal(ontId: string): Promise<SignalData>
  getONTStatus(ontId: string): Promise<ONTStatus>
  rebootONT(ontId: string): Promise<boolean>
  getActiveAlerts(): Promise<Alert[]>
  getCPUUsage(): Promise<number>
  getTemperature(): Promise<number>
  getPortStats(portId: string): Promise<PortStats>
  sendCommand(cmd: string): Promise<string>
}
```

**Para Huawei (SNMP + Telnet):**
- MIBs específicas: HUAWEI-GPON-MIB, HUAWEI-OLT-DEVICE-MIB
- Comandos Telnet: `display ont info`, `display ont optical-info`, `display alarm active`
- Parser de salida CLI de Huawei MA5800/MA5680T

**Para KingType (SNMP):**
- MIBs propietarias KingType
- Parseo de traps SNMP para LOS y DyingGasp
- Polling por SNMP v2c

**Para VSOL (Telnet/SSH):**
- Login por SSH o Telnet con credenciales
- Comandos VSOL específicos: `show gpon onu detail-info`, `show cpu`
- Parser de salida CLI VSOL V2801

---

### 2. API REST — Endpoints requeridos

**OLTs:**
```
GET    /api/v1/olts                        → listar todas las OLTs
GET    /api/v1/olts/:id                    → detalle de una OLT
POST   /api/v1/olts                        → agregar nueva OLT
PUT    /api/v1/olts/:id                    → actualizar configuración
DELETE /api/v1/olts/:id                    → eliminar OLT
GET    /api/v1/olts/:id/status             → estado actual (CPU, temp, uptime)
GET    /api/v1/olts/:id/ports              → listar puertos PON
GET    /api/v1/olts/:id/ports/:port/onts  → ONTs en un puerto PON
POST   /api/v1/olts/:id/command           → enviar comando CLI
```

**ONTs:**
```
GET    /api/v1/onts                        → listar todos los ONTs
GET    /api/v1/onts/:id                    → detalle de ONT
GET    /api/v1/onts/:id/signal             → señal actual (dBm TX/RX)
GET    /api/v1/onts/:id/signal/history     → historial 24h/7d/30d
POST   /api/v1/onts/:id/reboot             → reiniciar ONT de forma remota
POST   /api/v1/onts/:id/provision          → aprovisionar nuevo ONT
DELETE /api/v1/onts/:id                    → desprovisionar ONT
```

**Alertas:**
```
GET    /api/v1/alerts                      → alertas activas (filtros: severity, olt, type)
GET    /api/v1/alerts/history              → historial de alertas
PUT    /api/v1/alerts/:id/acknowledge      → reconocer alerta
PUT    /api/v1/alerts/:id/resolve          → marcar como resuelta
```

**Clientes:**
```
GET    /api/v1/clients                     → buscar clientes (nombre, MAC, IP, DNI)
GET    /api/v1/clients/:id                 → ficha completa del cliente
GET    /api/v1/clients/:id/ont            → ONT asignada al cliente
GET    /api/v1/clients/:id/tickets        → historial de tickets
POST   /api/v1/clients/:id/tickets        → crear ticket
```

**Dashboard:**
```
GET    /api/v1/dashboard/summary           → KPIs: totales OLTs, ONTs, alertas, LOS
GET    /api/v1/dashboard/network-health   → estado general de la red
```

---

### 3. WebSocket — Eventos en tiempo real

Implementá con Socket.io los siguientes eventos push al cliente:

```js
// Servidor emite:
socket.emit('ont:los', { ontId, clientName, oltId, port, timestamp })
socket.emit('ont:dying-gasp', { ontId, clientName, timestamp })
socket.emit('ont:online', { ontId, clientName, signal, timestamp })
socket.emit('alert:new', { alertId, severity, type, message, timestamp })
socket.emit('alert:resolved', { alertId, timestamp })
socket.emit('olt:cpu-high', { oltId, cpuPercent, timestamp })
socket.emit('ont:signal-update', { ontId, rxPower, txPower, timestamp })
socket.emit('network:summary', { totalONTs, online, offline, alerts })

// Cliente envía:
socket.on('subscribe:olt', (oltId) => { ... })
socket.on('subscribe:ont', (ontId) => { ... })
```

---

### 4. Jobs de polling (Bull + Redis)

```js
// Frecuencias de polling:
pollOLTStatus:    cada 60s  → CPU, temperatura, uptime, puertos activos
pollONTStatus:    cada 30s  → estado online/offline de todos los ONTs
pollSignal:       cada 5min → señal óptica RX/TX por ONT (guardar en TimescaleDB)
processAlerts:    cada 15s  → comparar estado actual con thresholds y generar alertas
signalHistory:    cada 1h   → comprimir y guardar promedios históricos
```

---

### 5. Modelos de base de datos

Diseñá los siguientes modelos con sus relaciones y migraciones:

- **OLT** (id, name, brand, model, ip, community, port, location, credentials_encrypted, status, uptime, cpu_usage, temperature, created_at)
- **PONPort** (id, olt_id, port_number, capacity, used, status)
- **ONT** (id, olt_id, pon_port_id, serial_number, mac, description, status, rx_power, tx_power, last_seen, provisioned_at)
- **Client** (id, ont_id, name, address, phone, email, service_plan, contract_number)
- **Alert** (id, olt_id, ont_id, type, severity, message, acknowledged, resolved, created_at, resolved_at)
- **SignalHistory** (ont_id, rx_power, tx_power, timestamp) — hypertable TimescaleDB

---

### 6. Motor de alertas

Implementá un **Alert Engine** con los siguientes thresholds configurables:

```js
const THRESHOLDS = {
  signal: {
    los_min: -27,       // dBm — por debajo = LOS
    high_signal_max: -8, // dBm — por encima = alta señal
    warn_low: -25,       // dBm — advertencia señal baja
  },
  olt: {
    cpu_critical: 85,    // % CPU
    cpu_warn: 70,
    temp_critical: 60,   // °C
    temp_warn: 50,
  }
}
```

Tipos de alerta: `LOS`, `DYING_GASP`, `HIGH_SIGNAL`, `LOW_SIGNAL`, `CPU_HIGH`, `TEMP_HIGH`, `TCONT_SATURATED`, `ONT_DOWN`, `OLT_UNREACHABLE`

---

### 7. Seguridad

- Autenticación JWT con refresh tokens en httpOnly cookies
- Rate limiting por IP (express-rate-limit)
- Encriptación de credenciales de OLT (AES-256 con clave en .env)
- Roles: `admin`, `noc`, `readonly`
- Logs de auditoría para comandos CLI ejecutados remotamente

---

## ENTREGABLES ESPERADOS

1. Código completo de todos los módulos descritos
2. Archivo `.env.example` con todas las variables necesarias
3. `docker-compose.yml` con: Node.js app + PostgreSQL + TimescaleDB + Redis
4. Script de seed de base de datos con datos de ejemplo (4 OLTs, 50 ONTs, 20 clientes)
5. Colección de Postman o archivo OpenAPI 3.0 con todos los endpoints documentados
6. Suite de tests unitarios para el Alert Engine y los parsers de OLT
7. README técnico explicando cómo levantar el proyecto en local

---

## RESTRICCIONES

- Todo el código en **JavaScript ES2022** (no TypeScript por ahora, se migra en v2)
- Los adaptadores de OLT deben ser **tolerantes a fallos** — si una OLT no responde, el sistema no debe caerse
- El parser de Telnet debe manejar timeouts y reconexión automática
- Las credenciales de OLT nunca deben loguearse ni exponerse en la API
- Los errores deben devolver respuestas JSON estandarizadas: `{ error, message, code, timestamp }`


---

## MÓDULOS ADICIONALES — PARIDAD SMARTOLT + TR-069

---

### 8. Zero-Touch Provisioning (ZTP)

Implementá un motor de **auto-aprovisionamiento** que cuando detecta un ONT nuevo (no autorizado) en cualquier puerto PON, lo configura automáticamente sin intervención manual.

```js
// Flujo ZTP:
// 1. OLT reporta ONT no autorizado (serial/MAC desconocida)
// 2. Sistema busca en la DB si hay un "pre-registro" pendiente para ese S/N
// 3. Si existe → aplica el perfil asignado automáticamente
// 4. Si no existe → crea alerta "ONT pendiente de autorización" en dashboard

class ZeroTouchEngine {
  async onNewONTDetected(oltId, portId, serialNumber, macAddress)
  async applyProfile(ontId, profileId) // configura T-CONT, GEMport, Flow, Service-port
  async authorizeONT(ontId, profileId, clientId)
  async getPendingONTs(oltId)
}
```

**Perfiles de aprovisionamiento** (guardar en DB, aplicables con 1 click):
- Nombre del perfil, tipo de conexión (DHCP / Static IP / PPPoE), VLAN de datos, VLAN de voz, VLAN de IPTV, T-CONT template, GEMport config, DBA profile, velocidad máxima upstream/downstream

**Para Huawei:** automatizar los comandos:
```
ont add [frame/slot/port] sn-auth [SN] omci ont-lineprofile-id [X] ont-srvprofile-id [Y]
service-port vlan [VLAN_ID] gpon [frame/slot/port] ont [ONT_ID] gemport [X] multi-service ...
```

**Para VSOL y KingType:** comandos equivalentes vía Telnet/SSH.

---

### 9. Configuración de tipo de conexión WAN por ONT

Endpoint y lógica para configurar el modo WAN de cada ONT:

```
POST /api/v1/onts/:id/wan-config
Body: {
  mode: 'dhcp' | 'static' | 'pppoe',
  // Si static:
  ip: '192.168.X.X',
  mask: '255.255.255.0',
  gateway: '192.168.X.1',
  dns1: '8.8.8.8',
  dns2: '8.8.4.4',
  // Si pppoe:
  username: 'user@isp.com',
  password: '****',
  vlan: 100
}
```

Traducir la configuración al comando correspondiente en cada OLT (Huawei/KingType/VSOL) y aplicarla remotamente vía Telnet/SSH.

---

### 10. Soporte EPON además de GPON

El adaptador de OLT debe detectar automáticamente si el puerto es GPON o EPON y usar los comandos/MIBs correspondientes:

```js
class OLTAdapter {
  async detectPortType(portId) // → 'gpon' | 'epon'
  async getONTsByProtocol(portId, protocol) // normaliza respuesta
}
```

- Para EPON: usar OIDs de EPON-MIB (IEEE 802.3ah), comandos `display epon onu-info`
- Ambos protocolos representados igual en la UI (árbol, tabla, alertas)
- Campo `protocol: 'GPON' | 'EPON'` en el modelo ONT

---

### 11. Triple Play — Perfiles de servicio multi-servicio

Soporte para configurar simultáneamente en un mismo ONT:
- **Datos** (Internet): VLAN de datos + GEMport de datos
- **VoIP**: VLAN de voz + GEMport de voz + SIP profile (servidor, usuario, contraseña)
- **IPTV/CATV**: VLAN de multicast + GEMport de IPTV + IGMP snooping

```
POST /api/v1/onts/:id/services
Body: {
  data:  { enabled: true, vlan: 100, speed_down: 100, speed_up: 20 },
  voip:  { enabled: true, vlan: 200, sip_server: '10.0.0.1', sip_user: '1001', sip_pass: '****' },
  iptv:  { enabled: true, vlan: 300, multicast_vlan: 301 }
}
```

Modelo `ServiceProfile` en DB: guarda la combinación de servicios como plantilla reutilizable.

---

### 12. VLAN por puerto Ethernet del ONT

Configurar VLANs en los puertos LAN físicos del ONT:

```
PUT /api/v1/onts/:id/ports/:eth_port/vlan
Body: {
  mode: 'access' | 'trunk' | 'hybrid',
  pvid: 100,
  tagged_vlans: [200, 300],   // solo en trunk/hybrid
  untagged_vlans: [100]        // solo en hybrid
}
```

- Huawei: `ont port vlan [ont-id] eth [port] [access|trunk|hybrid] pvid [vlan]`
- VSOL / KingType: comandos equivalentes
- UI: grilla de puertos LAN del ONT con badge de modo VLAN y edición inline

---

### 13. GPS y geolocalización de ONTs

**Modelo:** agregar campos `latitude`, `longitude`, `address`, `nap_box_id` al modelo ONT/Client.

**Endpoints:**
```
PUT  /api/v1/onts/:id/location       → guardar coordenadas GPS del ONT
GET  /api/v1/onts/map                → todos los ONTs con coordenadas para el mapa
GET  /api/v1/nap-boxes               → cajas NAP con ubicación
POST /api/v1/nap-boxes               → registrar nueva caja NAP
PUT  /api/v1/nap-boxes/:id/location  → actualizar ubicación de caja NAP
```

**Integración con TR-069:** si el CPE reporta su ubicación vía TR-069 (parámetro `InternetGatewayDevice.LANDevice.WLANConfiguration.X_Location`), guardarla automáticamente.

---

### 14. Alertas por Email y SMS

Implementar sistema de notificaciones externas:

**Canales:**
- Email: usar Nodemailer + SMTP configurable (o SendGrid API)
- SMS: integración con Twilio o gateway SMS local (configurable)

**Configuración en DB** (`NotificationConfig`):
```js
{
  channel: 'email' | 'sms',
  destination: 'noc@isp.com' | '+549XXXXXXXXXX',
  events: ['LOS', 'DYING_GASP', 'OLT_UNREACHABLE', 'CPU_HIGH'],
  severity_min: 'warning' | 'critical',
  schedule: { // solo notificar en horario laboral si se desea
    always: true,
    // o: days: [1,2,3,4,5], from: '08:00', to: '22:00'
  }
}
```

**Endpoints:**
```
GET  /api/v1/notifications/config       → listar configuraciones
POST /api/v1/notifications/config       → agregar canal
PUT  /api/v1/notifications/config/:id   → editar
POST /api/v1/notifications/test         → enviar notificación de prueba
```

**Template de email** (HTML): incluir nombre del cliente afectado, OLT, puerto, señal, timestamp y link directo al ONT en el dashboard.

---

### 15. Speed Limiting — Control de velocidad por ONT

Configurar límites de ancho de banda por ONT aplicados en la OLT:

```
PUT /api/v1/onts/:id/speed
Body: {
  download_mbps: 100,   // límite downstream
  upload_mbps: 20,      // límite upstream
  burst_down: 120,      // burst permitido
  burst_up: 25,
  profile_name: 'Plan 100/20'
}
```

- Huawei: modificar DBA profile asociado al T-CONT del ONT
- VSOL/KingType: comando equivalente de limitación de tráfico
- Guardar el plan comercial actual en `Client.service_plan` y el speed profile en `ONT.speed_profile_id`
- Endpoint adicional: `GET /api/v1/speed-profiles` → catálogo de planes (ej: 50/10, 100/20, 300/50)

---

### 16. DHCP Control y tabla MAC del ONT

**Tabla MAC:**
```
GET /api/v1/onts/:id/mac-table   → MACs aprendidas en puertos LAN del ONT
DELETE /api/v1/onts/:id/mac-table → limpiar tabla MAC
```

**Control DHCP:**
```
GET  /api/v1/onts/:id/dhcp-leases     → IPs asignadas por DHCP al ONT
POST /api/v1/onts/:id/dhcp-release    → forzar liberación de IP
POST /api/v1/onts/:id/dhcp-renew      → forzar renovación
```

Obtener esta info vía SNMP (OID de DHCP snooping binding table) o Telnet (`display mac-address`, `display dhcp-snooping user-bind`).

---

### 17. SERVIDOR TR-069 (ACS — Auto Configuration Server)

Implementar un **servidor ACS TR-069 completo** integrado en el backend de Pixel Studios OLT. TR-069 permite gestión remota bidireccional de CPEs (ONTs con TR-069, routers, módems) sin depender de Telnet/SNMP.

**Stack recomendado:**
- Librería base: `genieacs` (Node.js, open source, el ACS TR-069 más usado) — integrar como módulo o correr como sidecar
- Alternativa: implementar el protocolo CWMP (TR-069) directamente sobre Express con SOAP/XML

**Protocolo CWMP — funciones a implementar:**

```
INFORM           → CPE se registra y reporta su estado al ACS
GET_PARAMETER_VALUES  → leer parámetros del CPE (IP, DNS, velocidad, señal)
SET_PARAMETER_VALUES  → escribir parámetros (cambiar SSID, contraseña WiFi, DNS)
REBOOT           → reiniciar el CPE remotamente
FACTORY_RESET    → restaurar a valores de fábrica
DOWNLOAD         → enviar nuevo firmware al CPE
UPLOAD           → obtener logs o configuración del CPE
GET_RPC_METHODS  → descubrir qué soporta el CPE
```

**Endpoints internos del ACS:**
```
POST /tr069/                          → endpoint CWMP que reciben los CPEs (SOAP over HTTP/HTTPS)
GET  /api/v1/tr069/devices            → listar CPEs registrados
GET  /api/v1/tr069/devices/:id        → parámetros actuales del CPE
PUT  /api/v1/tr069/devices/:id/params → modificar parámetros remotamente
POST /api/v1/tr069/devices/:id/reboot → reboot vía TR-069
POST /api/v1/tr069/devices/:id/firmware → push de firmware
GET  /api/v1/tr069/devices/:id/tasks  → cola de tareas pendientes para el CPE
```

**Modelo `TR069Device`:**
```js
{
  id, serial_number, oui, product_class, manufacturer,
  software_version, hardware_version, ip_address,
  last_inform, connection_request_url,
  ont_id,        // FK → ONT si está asociado
  client_id,     // FK → Client
  parameters: {} // JSON con todos los parámetros reportados
}
```

**Casos de uso que habilita TR-069:**
- Cambiar SSID y contraseña WiFi del router del cliente remotamente
- Push automático de firmware a toda la flota de CPEs
- Leer nivel de señal, temperatura y estadísticas del ONT directamente
- Configurar PPPoE/DHCP/Static sin Telnet a la OLT
- Auto-aprovisionamiento: el CPE se conecta, el ACS le aplica el perfil
- Diagnóstico remoto: ping test, traceroute desde el CPE

**Configuración del CPE para apuntar al ACS:**
```
ACS URL: http(s)://tu-servidor:7547/tr069/
Username: [por CPE o global]
Password: [por CPE o global]
Periodic Inform Interval: 300 segundos
```

**Seguridad:**
- HTTPS obligatorio en producción (certificado SSL)
- Autenticación HTTP Digest o Basic por CPE
- Connection Request también con autenticación
- Logs de auditoría de cada sesión CWMP

**Integración con el resto del sistema:**
- Cuando un CPE hace INFORM → actualizar `TR069Device.last_inform` y parámetros
- Si el CPE reporta señal óptica → guardar en `SignalHistory` (TimescaleDB)
- Si el CPE va offline (no hace INFORM en 2× el intervalo) → generar alerta

