-- CreateTable
CREATE TABLE "net_status_history" (
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "online" INTEGER NOT NULL,
    "powerfail" INTEGER NOT NULL DEFAULT 0,
    "los" INTEGER NOT NULL DEFAULT 0,
    "na" INTEGER NOT NULL DEFAULT 0,
    "offline" INTEGER,

    CONSTRAINT "net_status_history_pkey" PRIMARY KEY ("timestamp")
);
