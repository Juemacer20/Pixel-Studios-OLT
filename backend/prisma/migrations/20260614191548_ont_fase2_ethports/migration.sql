-- FASE 2 — eth-port state (display ont port state ... eth-port all).
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "eth_ports" JSONB;
