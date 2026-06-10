-- CreateTable
CREATE TABLE "olt_traffic_history" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "if_index" INTEGER NOT NULL,
    "if_descr" TEXT,
    "is_uplink" BOOLEAN NOT NULL DEFAULT false,
    "rx_mbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tx_mbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "olt_traffic_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "olt_traffic_history_olt_id_timestamp_idx" ON "olt_traffic_history"("olt_id", "timestamp");

