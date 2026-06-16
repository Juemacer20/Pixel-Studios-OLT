-- CC-10: Add odb_port to ONT model
ALTER TABLE "onts" ADD COLUMN IF NOT EXISTS "odb_port" INTEGER;
