-- FASE 2 enriquecimiento ONU — GRUPO WAN (display ont wan-info). Todas nullable.
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_ip_source" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_encap" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_mask" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_gateway" TEXT;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_vlan" INTEGER;
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "wan_info" JSONB;
