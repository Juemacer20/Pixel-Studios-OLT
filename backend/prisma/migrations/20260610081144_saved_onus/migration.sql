-- CreateTable
CREATE TABLE "saved_onus" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "name" TEXT,
    "olt_id" TEXT,
    "olt_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_onus_pkey" PRIMARY KEY ("id")
);

