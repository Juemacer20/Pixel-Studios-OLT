# 🌐 Pixel Studios OLT

**Plataforma de gestión y monitoreo de OLTs** compatible con Huawei (MA5800, MA5680T), KingType y VSOL.

## Stack
- **Backend:** Node.js + Express + SNMP + Telnet/SSH
- **Frontend:** React + Vite + Tailwind CSS
- **DB:** PostgreSQL + TimescaleDB + Redis
- **Infra:** Docker Compose + Nginx

## Módulos
- Dashboard NOC en tiempo real
- Gestión de OLTs Huawei / KingType / VSOL
- Monitoreo de ONTs (LOS, DyingGasp, señal óptica)
- Árbol GPON visual
- Sistema de alertas con severidad
- Historial de señal óptica por cliente
- Gestión de clientes con ficha técnica
- Perfiles VLAN y configuración remota

## Inicio rápido
\`\`\`bash
docker-compose -f infra/docker/docker-compose.yml up -d
\`\`\`

## Prompts de desarrollo
- `docs/api/README.md` — Prompt para backend, API y funcionalidades
- `docs/ui/README.md` — Prompt para UI/UX y componentes frontend

---
*Pixel Studios © 2026*

## Módulos completos

### Gestión de red
- Dashboard NOC en tiempo real (WebSocket)
- Gestión de OLTs Huawei (MA5800, MA5680T) / KingType / VSOL
- Monitoreo de ONTs: LOS, DyingGasp, señal óptica RX/TX
- Árbol GPON/EPON visual interactivo
- Terminal CLI integrada (Telnet/SSH en browser)
- Soporte EPON + GPON

### Aprovisionamiento
- Zero-Touch Provisioning (ZTP) — auto-config al detectar ONT nuevo
- Perfiles de aprovisionamiento reutilizables
- Configuración WAN: DHCP / IP Estática / PPPoE por ONT
- Triple Play: Datos + VoIP (SIP) + IPTV/Multicast
- VLAN por puerto ETH del ONT (Access/Trunk/Hybrid)
- Speed Limiting — planes de velocidad aplicados en OLT

### TR-069 / ACS
- Servidor ACS TR-069 integrado (CWMP sobre HTTP/HTTPS)
- Gestión remota de CPEs: leer/escribir parámetros
- Push de firmware a toda la flota
- Diagnósticos remotos (ping, traceroute desde CPE)
- Cola de tareas con estado en tiempo real

### Monitoreo y alertas
- Motor de alertas configurable con thresholds
- Notificaciones por Email (SMTP/SendGrid) y SMS (Twilio)
- Historial de señal óptica en TimescaleDB
- Control DHCP y tabla MAC por ONT
- Mapa GPS de ONTs y cajas NAP (Leaflet + OpenStreetMap)
- Heatmap de señal por zona

### Sistema
- API REST documentada (OpenAPI 3.0)
- Roles: admin / noc / readonly
- Self-hosted: Docker Compose on-premise
- Mobile responsive + Modo campo para técnicos
