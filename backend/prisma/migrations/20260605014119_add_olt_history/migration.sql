-- CreateTable
CREATE TABLE "olt_history" (
    "olt_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpu_usage" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,

    CONSTRAINT "olt_history_pkey" PRIMARY KEY ("olt_id","timestamp")
);

-- AddForeignKey
ALTER TABLE "olt_history" ADD CONSTRAINT "olt_history_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "olts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
