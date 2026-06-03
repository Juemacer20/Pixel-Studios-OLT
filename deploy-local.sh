#!/bin/bash
# deploy-local.sh — Levanta el stack completo de Pixel Studios OLT
# Uso: bash deploy-local.sh [--pull]
set -e

REPO_DIR="/mnt/claude-storage/proyectos/Pixel-Studios-OLT"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
NPM="/usr/share/nodejs/corepack/shims/npm"
LOG="/tmp/pixel-olt-deploy.log"
WA_URL="http://localhost:5003/send"
WA_TO="5493456516807@c.us"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

send_wa() {
  local msg="$1"
  curl -s -X POST "$WA_URL" \
    -H "Content-Type: application/json" \
    -d "{\"groupId\":\"$WA_TO\",\"text\":\"$msg\"}" >> "$LOG" 2>&1 || true
}

log "=== DEPLOY Pixel Studios OLT ==="

# 1. Git pull si se pide
if [[ "$1" == "--pull" ]]; then
  log "Pulling from GitHub..."
  cd "$REPO_DIR" && git pull origin main >> "$LOG" 2>&1
  log "Pull OK"
fi

# 2. Docker: Postgres + Redis
log "Levantando Postgres y Redis..."
docker compose -f "$REPO_DIR/infra/docker/docker-compose.yml" up -d postgres redis >> "$LOG" 2>&1
sleep 5
log "Postgres y Redis OK"

# 3. Backend: instalar deps + migraciones
log "Instalando dependencias backend..."
export PATH="/usr/share/nodejs/corepack/shims:$PATH"
cd "$BACKEND_DIR" && $NPM install --silent >> "$LOG" 2>&1

log "Corriendo migraciones..."
cd "$BACKEND_DIR" && npx prisma migrate deploy >> "$LOG" 2>&1 || true
cd "$BACKEND_DIR" && npx prisma generate >> "$LOG" 2>&1 || true

# Seed solo si la tabla olts está vacía
OLT_COUNT=$(PGPASSWORD=password psql -h localhost -U postgres -d pixel_studios_olt -t -c "SELECT COUNT(*) FROM olts;" 2>/dev/null | tr -d ' ' || echo "0")
if [[ "$OLT_COUNT" == "0" ]]; then
  log "Cargando seed data..."
  cd "$BACKEND_DIR" && node prisma/seed.js >> "$LOG" 2>&1 || true
fi

# Matar backend previo si existe
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "nodemon src/server.js" 2>/dev/null || true
sleep 2

# Arrancar backend
log "Arrancando backend en puerto 3005..."
cd "$BACKEND_DIR" && NODE_ENV=production nohup node src/server.js >> /tmp/pixel-olt-backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > /tmp/pixel-olt-backend.pid
sleep 4

# Verificar backend
if curl -s http://localhost:3005/api/v1/auth/login -X POST \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@pixel-studios.com","password":"password"}' | grep -q "accessToken"; then
  log "Backend OK (PID $BACKEND_PID)"
else
  log "WARNING: Backend no responde todavía — puede necesitar más tiempo"
fi

# 4. Frontend: build + servir
log "Instalando dependencias frontend..."
cd "$FRONTEND_DIR" && $NPM install --silent >> "$LOG" 2>&1

log "Compilando frontend..."
cd "$FRONTEND_DIR" && $NPM run build >> "$LOG" 2>&1

# Matar frontend previo
pkill -f "serve.*dist" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Servir frontend compilado en puerto 3000
log "Sirviendo frontend en puerto 3000..."
cd "$FRONTEND_DIR" && nohup npx serve dist -l 3000 --no-clipboard >> /tmp/pixel-olt-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > /tmp/pixel-olt-frontend.pid
sleep 3

# 5. Verificación final
log ""
log "=== STACK LISTO ==="
log "  Frontend:  http://192.168.3.173:3000"
log "  Backend:   http://192.168.3.173:3005"
log "  Postgres:  localhost:5432"
log "  Redis:     localhost:6379"
log ""
log "  Login:     admin@pixel-studios.com / password"
log ""

send_wa "✅ *Pixel Studios OLT listo!*

🌐 Frontend: http://192.168.3.173:3000
⚙️ Backend: http://192.168.3.173:3005

👤 Login: admin@pixel-studios.com
🔑 Pass: password

El rediseño completo tipo SmartOLT está deployado y corriendo."

log "Notificación WA enviada"
log "=== FIN DEPLOY ==="
