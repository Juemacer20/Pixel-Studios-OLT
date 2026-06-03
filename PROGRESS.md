# Pixel Studios OLT — Build Progress
Última actualización: 2026-06-03

- [x] FASE 1: Backend base — Express app, config (DB, Redis, SNMP, Telnet via net.Socket), middleware (auth, rate limiter, logger, error handler), server con Socket.io ✅
- [x] FASE 2: Schema DB — Prisma schema completo (14 modelos, 6 enums): OLT, PONPort, ONT, Client, Alert, SignalHistory (TimescaleDB), TR069Device, ServiceProfile, ZTPProfile, NotificationConfig, SpeedProfile, NAPBox, DHCPLease, AuditLog ✅
- [x] FASE 3: OLT Adapters — Factory pattern + adaptadores: Huawei MA5800 (SNMP+Telnet), MA5680T (extends MA5800), KingType C300 (SNMP v2c), VSOL V2801 (SSH via ssh2) ✅
- [x] FASE 4: REST API — 15 grupos de rutas: auth, olts, onts, alerts, clients, dashboard, reports, ztp, tr069, map, notifications, dhcp, gps, vlan, speed-profiles ✅
- [x] FASE 5: Auth + Security — JWT + refresh tokens (httpOnly cookies), RBAC (admin/noc/readonly), AES-256-GCM credential encryption, audit logging en DB ✅
- [x] FASE 6: Jobs + WebSocket — Bull queues: pollOLTs (60s), signalHistory (5min), alertEngine (15s); Socket.io rooms; JWT socket auth; eventos: ont:los, ont:dying-gasp, ont:online, alert:new, alert:resolved, olt:cpu-high, ont:signal-update ✅
- [x] FASE 7: Advanced backend modules — ZTP engine, speed limiting (DBA commands), VLAN config, TR-069 ACS server (CWMP SOAP), notification engine (Nodemailer + Twilio), GPS service ✅
- [x] FASE 8: Frontend setup — Vite + React 18, Tailwind CSS v3 con design system custom, IBM Plex Mono + DM Sans, animaciones ✅
- [x] FASE 9: Layout components — Sidebar colapsable (220px/52px), Topbar, AlertBanner, shared: DataTable, Drawer, StatusDot, CopyButton, EmptyState ✅
- [x] FASE 10: Dashboard components — KPICards, OLTTable CPU bar, AlertsPanel, ONTTable, FiberTree, SignalChart AreaChart (RX/TX + ReferenceLine LOS/HIGH), SignalBar, SignalBadge ✅
- [x] FASE 11: Pages + hooks + stores — 9 páginas, Zustand stores (olt/ont/alert/ui/auth), TanStack Query hooks, useWebSocket con LOS toast IBM Plex Mono ✅
- [x] FASE 12: Advanced UI modules — OLTTerminal, WANConfig (tabs), ZTPDrawer, PendingONTs, ProfileManager, TR069DeviceDrawer (6 tabs), MapView (Leaflet), SpeedControl, DHCPLeases, MACTable ✅
- [x] FASE FINAL: Seed script (4 OLTs, 50+ ONTs, clientes argentinos), OpenAPI 3.0, README quickstart ✅

## Fixes aplicados en esta sesión
- Vite proxy corregido: puerto 3005 → 3001
- app.js: rutas dhcp/gps/vlan/speed-profiles ahora montadas
- ZTP page creada + ruta /ztp añadida a App.jsx
- snmpVsol.js: stub reemplazado con clase SNMPVsol real

## Estado: COMPLETO — listo para desarrollo y despliegue

### Inicio rápido
```bash
# Backend
cd backend && npm install && cp .env.example .env
docker-compose -f infra/docker/docker-compose.yml up -d
npx prisma migrate dev && npx prisma db seed
npm run dev

# Frontend
cd frontend && npm install
npm run dev   # http://localhost:5173
```

### Credenciales demo
- Email: admin@pixel-studios.com  
- Password: password
