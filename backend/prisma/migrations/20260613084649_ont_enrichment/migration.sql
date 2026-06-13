-- AlterTable: campos de enriquecimiento de ONT desde la OLT
ALTER TABLE "onts" ADD COLUMN "enriched_at" TIMESTAMP(3),
ADD COLUMN "last_down_cause" TEXT,
ADD COLUMN "line_profile" TEXT,
ADD COLUMN "srv_profile" TEXT;
