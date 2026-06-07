# Pixel Studios OLT

> **Skills y subagentes globales:** `C:\Users\Santi\.claude\skills\` — ver `~/.claude/CLAUDE.md`
> **Skill activa en este proyecto:** `ui-ux-pro-max` (React 18 + Tailwind — NO activar para backend Node.js)

Plataforma enterprise de gestión y monitoreo de OLTs para ISPs. Administra redes GPON/EPON, provisiona ONTs automáticamente (ZTP), controla velocidades, gestiona triple-play (Datos + VoIP + IPTV) y ejecuta comandos CLI remotos en tiempo real.

**Fabricantes soportados:** Huawei MA5800/MA5680T (SNMP+Telnet) · KingType C300 (SNMP) · VSOL V2801 (SSH)

## Selección de modelo para subagentes

| Modelo | Cuándo usar |
|--------|-------------|
| `haiku` | Buscar archivos, grep de endpoints, leer schema Prisma, verificar modelos, inspeccionar adapters OLT |
| `sonnet` | Escribir endpoints, nuevos adapters, páginas React, modificar jobs Bull, refactors (default) |
| `opus` | Diseñar nueva arquitectura de adapter, resolver bugs de SNMP/Telnet, decisiones sobre TimescaleDB |

> **Haiku para encontrar. Sonnet para hacer. Opus para decidir.**

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + Express.js + Prisma 5 |
| Frontend | React 18 + Vite + Tailwind CSS v3 + Zustand + TanStack Query |
| Base de datos | PostgreSQL 16 + TimescaleDB (series de tiempo: señal, CPU, temp) |
| Cache/Jobs | Redis 7 + Bull (pollOLTs, signalHistory, alertEngine) |
| Real-time | Socket.io 4.6 (LOS, alertas, updates) |
| Auth | JWT (15m) + refresh tokens (7d) + RBAC (admin/noc/readonly) |
| Encriptación | AES-256-GCM para credenciales OLT en DB |
| Protocolos | SNMP v2c · Telnet · SSH · TR-069 CWMP |
| Notificaciones | Nodemailer (SMTP/SendGrid) + Twilio (SMS) |

## Estructura

```
backend/src/
├── services/
│   ├── huawei/        # MA5800, MA5680T — SNMP + Telnet CLI
│   ├── kingtype/      # C300 — SNMP
│   ├── vsol/          # V2801 — SSH
│   ├── gpon/          # EPON + triple-play
│   ├── ztp/           # Zero-Touch Provisioning
│   ├── tr069/         # ACS CWMP server (SOAP parser, firmware push)
│   └── notifications/ # Email + SMS engine
├── jobs/              # Bull: pollOLTs (60s), signalHistory (5m), alertEngine (15s)
├── routes/            # 15 grupos: olts, onts, alerts, dashboard, ztp, tr069, map, vlan, speed...
├── controllers/       # Request handlers
├── middleware/        # auth.js (JWT+RBAC), rateLimiter, errorHandler, logger
└── prisma/
    ├── schema.prisma  # 14 modelos: OLT, ONT, Alert, Client, ZTPProfile, TR069Device...
    └── seed.js        # 4 OLTs, 50 ONTs, 8 NAP boxes, clientes argentinos demo

frontend/src/
├── pages/             # 23 páginas lazy-loaded (Dashboard, OLTs, ONTs, Map, TR069, ZTP...)
├── components/        # dashboard/, onts/, signal/, map/, ztp/, tr069/, shared/
├── store/             # Zustand: authStore, oltStore, ontStore, alertStore, uiStore
└── hooks/             # useOLTs, useONTs, useAlerts, useSignal, useWebSocket
```

## Puertos

| Servicio | Dev | Descripción |
|----------|-----|-------------|
| Frontend | :5173 | Vite (proxea /api y /socket.io a :3001) |
| Backend | :3001 | REST API + Socket.io |
| PostgreSQL | :5433 | Dev (producción :5432 interno) |
| Redis | :6380 | Dev (producción :6379 interno) |

## Comandos

```bash
# 1. Infraestructura (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d

# 2. Backend
cd backend && npm install
npx prisma migrate dev && npx prisma generate && npx prisma db seed
npm run dev   # :3001

# 3. Frontend (nueva terminal)
cd frontend && npm install && npm run dev   # :5173

# Credenciales demo
admin@pixel-studios.com / password  (admin)
noc@pixel-studios.com / password    (noc — read/write, no delete)
viewer@pixel-studios.com / password  (readonly)
```

## Jobs automáticos (Bull + Redis)

| Job | Intervalo | Qué hace |
|-----|-----------|----------|
| `pollOLTs` | 60s | CPU, temp, uptime → OLTHistory (TimescaleDB) · emite `olt:update` |
| `signalHistory` | 5m | RX/TX dBm → SignalHistory · emite `ont:signal-update` |
| `alertEngine` | 15s | Evalúa thresholds (LOS ≤-27dBm, CPU≥85%, Temp≥60°C) · crea/resuelve alertas |

## Thresholds de alerta

- **LOS crítico:** RX ≤ -27 dBm
- **Señal alta:** RX ≥ -8 dBm (posible reflexión)
- **CPU crítico:** ≥ 85%
- **Temp crítico:** ≥ 60°C

## Variables de entorno clave (.env)

```
NODE_ENV, PORT=3001, DATABASE_URL, REDIS_HOST/PORT
JWT_SECRET, JWT_REFRESH_SECRET, AES_KEY (32 chars)
SMTP_HOST/PORT/USER/PASS, TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER
POLL_OLT_INTERVAL=60000, POLL_SIGNAL_INTERVAL=300000, ALERT_ENGINE_INTERVAL=15000
```

## Estado del proyecto

**v3.3.0 — COMPLETO Y LISTO PARA DEPLOY** (2026-06-03)

Todas las fases completadas: backend base, schema DB, adapters OLT, REST API (15 grupos), auth/seguridad, jobs+WebSocket, módulos avanzados (ZTP, TR-069, notificaciones), frontend completo (23 páginas), seed script, OpenAPI docs.

## Skills Claude Code

| Skill | Cuándo usar | Estrategia para este proyecto |
|-------|-------------|-------------------------------|
| `/run` | Levantar el stack de desarrollo | `docker-compose -f docker-compose.dev.yml up -d` luego backend + frontend en paralelo |
| `/verify` | Después de cambios en adapters o jobs | Verificar en frontend que datos de OLT/ONT llegan en tiempo real vía WebSocket; probar alertas |
| `/code-review` | Antes de cambios en adapters Huawei/KingType/VSOL | Verificar que SNMP timeouts y Telnet sessions se cierran correctamente; no memory leaks |
| `/code-review ultra` | Antes de deploy a producción | Revisión de seguridad: AES key, JWT secrets, RBAC, rate limiting en comandos CLI |
| `/claude-api` | No aplica — este proyecto no usa Anthropic SDK | — |
| `/simplify` | Revisión de `oltFactory.js` y adapters | Los 3 adapters tienen lógica similar que podría abstraerse más |
| `/security-review` | Antes de exponer al exterior | AES-256 para credenciales OLT, JWT, rate limiter en `/command`, CORS, HTTPS |
| `/update-config` | Setup del entorno | Permisos para `docker-compose`, `npm run dev`, `npx prisma migrate`, `npx prisma db seed` |
| `/fewer-permission-prompts` | Desarrollo activo | Allowlist para `docker-compose`, `npx prisma`, `npm run dev` (backend y frontend) |
| `/loop` | Monitoreo de jobs durante testing | Monitorear logs de `pollOLTs` y `alertEngine` en tiempo real |
| `/schedule` | Tareas automáticas de mantenimiento | Programar backups DB, limpieza de señal histórica, reportes de alertas |
| `/review` | PRs con nuevos adapters o endpoints | Verificar que el nuevo adapter implementa correctamente la interfaz OLT factory |
