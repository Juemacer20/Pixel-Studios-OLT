-- FASE 2 enriquecimiento ONU — GRUPO GRATIS.
-- Campos que ya vienen en `display ont info` (sin comando extra). Todas nullable.
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "cpu_pct" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "mem_pct" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "tr069_enabled" BOOLEAN;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "tr069_ip_index" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "online_duration" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "last_up" TIMESTAMP(3);
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "last_down" TIMESTAMP(3);
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "ports" JSONB;
