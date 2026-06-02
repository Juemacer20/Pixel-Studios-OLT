# Pixel Studios OLT

Plataforma de gestión y monitoreo de OLTs para ISPs. Soporta Huawei MA5800/MA5680T, KingType C300 y VSOL V2801.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + Express.js |
| Base de datos | PostgreSQL 16 + TimescaleDB |
| Cache / Queues | Redis 7 + Bull |
| ORM | Prisma |
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| WebSocket | Socket.io |
| Protocolos | SNMP v2c, Telnet (Huawei CLI), SSH (VSOL), TR-069 (CWMP) |

## Inicio rápido

### Requisitos
- Docker + Docker Compose
- Node.js 20+

### 1. Clonar y configurar variables de entorno
```bash
git clone https://github.com/juemacer20/pixel-studios-olt.git
cd pixel-studios-olt
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores (JWT_SECRET, AES_KEY, SMTP, etc.)
```

### 2. Levantar infraestructura
```bash
docker-compose -f infra/docker/docker-compose.yml up -d
```
Esto levanta PostgreSQL 16 con TimescaleDB y Redis 7.

### 3. Instalar dependencias y migrar la base de datos
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Cargar datos de demo (opcional)
```bash
npm run seed
```
Crea 4 OLTs, 50 ONTs, 20+ clientes argentinos y 24h de historial de señal.

### 5. Iniciar el backend
```bash
npm run dev        # desarrollo (nodemon)
npm start          # producción
```
El servidor queda en `http://localhost:3001`.

### 6. Iniciar el frontend
```bash
cd ../frontend
npm install
npm run dev
```
La UI queda en `http://localhost:5173`.

### Login por defecto
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | admin |
| noc | noc123 | noc |
| viewer | viewer123 | readonly |

---

## Módulos

### Monitoreo en tiempo real
- Dashboard NOC con KPIs: OLTs online, ONTs activas, alertas críticas, eventos LOS
- Árbol GPON visual: OLT → Puerto PON → ONTs
- WebSocket push para actualizaciones sin polling manual
- Historial de señal óptica (RX/TX) en TimescaleDB — gráficos Recharts

### Gestión de OLTs y ONTs
- CRUD de OLTs con credenciales cifradas (AES-256-GCM)
- Adaptadores por marca/modelo: Huawei MA5800, MA5680T, KingType C300, VSOL V2801
- SNMP primario + Telnet/SSH como fallback
- Terminal CLI en browser (SSH/Telnet proxy)
- Reboot de ONT remoto con audit log

### Sistema de alertas
- Motor de alertas con thresholds configurables
  - LOS: RX ≤ -27 dBm
  - Señal alta: RX ≥ -8 dBm
  - Señal baja: RX ≤ -25 dBm
  - CPU crítico: ≥ 85%
  - Temperatura crítica: ≥ 60°C
- Auto-resolución al recuperarse la señal
- Notificaciones por Email (SMTP/SendGrid) y SMS (Twilio)

### Aprovisionamiento (ZTP)
- Detección automática de ONTs nuevas (no autorizadas)
- Perfiles ZTP: aplica VLAN, plan de velocidad y servicios en un click
- Configuración WAN por ONT: DHCP / IP Estática / PPPoE
- Triple Play: Datos + VoIP (SIP) + IPTV/Multicast
- VLAN por puerto ETH del ONT (Access/Trunk/Hybrid)
- Speed Limiting — perfiles de velocidad aplicados vía OLT

### TR-069 / ACS
- Servidor ACS integrado (endpoint `/api/v1/acs`, CWMP SOAP)
- Leer/escribir parámetros de CPE remotamente
- Push de firmware a dispositivos
- Diagnósticos remotos (ping, traceroute desde CPE)
- Cola de tareas con estado en tiempo real

### Mapa GPS
- ONTs y cajas NAP sobre OpenStreetMap (Leaflet)
- Marcadores coloreados por estado de señal
- Heatmap de calidad de señal por zona

### Sistema
- API REST con OpenAPI 3.0 (`docs/api/openapi.yaml`)
- RBAC: roles admin / noc / readonly
- Rate limiting y audit log completo
- Self-hosted: 100% Docker on-premise

---

## Estructura del proyecto

```
Pixel-Studios-OLT/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # 14 modelos, 6 enums
│   │   └── seed.js             # Datos de demo argentinos
│   └── src/
│       ├── config/             # DB, Redis, SNMP, Telnet
│       ├── middleware/         # Auth, rate limiter, logger, error handler
│       ├── routes/             # 12 grupos de rutas REST
│       ├── services/           # Lógica de negocio y adaptadores OLT
│       │   ├── huawei/         # MA5800, MA5680T (SNMP + Telnet)
│       │   ├── kingtype/       # KingType (SNMP)
│       │   ├── vsol/           # VSOL (SSH)
│       │   ├── tr069/          # ACS + CWMP handler
│       │   ├── ztp/            # Zero-Touch Provisioning
│       │   └── notifications/  # Email + SMS engine
│       ├── jobs/               # Bull queues (poll, signal, alerts)
│       └── utils/              # Factory, encryption, dBm calculator
├── frontend/
│   └── src/
│       ├── components/         # Layout, dashboard, signal, ZTP, TR-069, map, ONT
│       ├── hooks/              # React Query + WebSocket hooks
│       ├── pages/              # Dashboard, OLTs, ONTs, Alerts, Clients, Map, TR-069
│       ├── services/           # axios API client + socket.io
│       └── store/              # Zustand stores (olt, ont, alert, ui)
├── infra/
│   └── docker/
│       └── docker-compose.yml  # PostgreSQL + Redis + backend
└── docs/
    └── api/
        └── openapi.yaml        # Documentación completa de la API
```

---

## Variables de entorno clave

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/pixel_studios_olt
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=cambia_esto_en_produccion
JWT_REFRESH_SECRET=cambia_esto_tambien
AES_KEY=64_hex_chars_para_AES256
SNMP_COMMUNITY=public
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu@email.com
SMTP_PASS=tu_app_password
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM=+1234567890
```

---

*Pixel Studios © 2026*
