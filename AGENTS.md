# AGENTS.md

> ⚠️ **OBLIGATORIO antes de tocar el repo:** en este proyecto trabajan **dos agentes de IA en
> paralelo** (Claude Code y OpenCode). **Leé y respetá `COLLAB.md`** — tiene las reglas de
> coordinación de cumplimiento obligatorio. No son opcionales.

## Reglas mínimas (el detalle completo está en COLLAB.md)

1. **Git:** commiteá SOLO tus archivos por nombre (`git add ruta/archivo`). **PROHIBIDO** `git add .`
   / `git add -A`. **PROHIBIDO** `git reset --hard` o `git checkout -- <archivo>` sobre archivos que
   la otra IA pueda estar editando (borra trabajo sin commitear, irrecuperable).
2. **Ramas:** trabajá en tu propia rama cuando puedas; `git pull --rebase` antes de pushear a `main`.
3. **Propiedad de áreas:** ver tabla en COLLAB.md §3. Archivos COMPARTIDOS (`ONUView`, `schema.prisma`,
   `api.js`): coordinar y avisar.
4. **Entorno:** no reiniciar PM2 ni matar procesos sin avisar; no correr scans contra la misma OLT en
   paralelo (VTY limitada); backend OLT = puerto **3005** (3001 es de otro proyecto). Detalle en COLLAB.md §4.
5. **Tablón:** actualizá tu línea en COLLAB.md §5 con qué estás tocando.

## Contexto del proyecto
Plataforma de gestión de OLTs (Huawei/VSOL/KingType) estilo SmartOLT. Stack: Node.js+Express+Prisma+
PostgreSQL+Redis+Bull (backend), React+Vite (frontend). Detalle técnico en `CLAUDE.md` y `docs/`.
Trabajo de enriquecimiento de ONUs en curso: `docs/ENRIQUECIMIENTO_ONU_FASE2.md`.
