-- FASE 2 enriquecimiento ONU — GRUPO service-port (display service-port + traffic table). Nullable.
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "service_port_id" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "gem" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "download_profile" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "upload_profile" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "download_mbps" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "upload_mbps" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "service_ports" JSONB;
