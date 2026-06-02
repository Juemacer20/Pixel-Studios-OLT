-- CreateEnum
CREATE TYPE "OLTStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ONTStatus" AS ENUM ('ONLINE', 'OFFLINE', 'LOS', 'DYING_GASP', 'PENDING', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOS', 'DYING_GASP', 'HIGH_SIGNAL', 'LOW_SIGNAL', 'CPU_HIGH', 'TEMP_HIGH', 'PORT_DOWN', 'ONT_OFFLINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Protocol" AS ENUM ('GPON', 'EPON', 'XGSPON');

-- CreateEnum
CREATE TYPE "WANMode" AS ENUM ('DHCP', 'STATIC', 'PPPOE');

-- CreateTable
CREATE TABLE "olts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "community" TEXT NOT NULL DEFAULT 'public',
    "port" INTEGER NOT NULL DEFAULT 161,
    "location" TEXT,
    "credentials_encrypted" TEXT,
    "status" "OLTStatus" NOT NULL DEFAULT 'OFFLINE',
    "uptime" BIGINT,
    "cpu_usage" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pon_ports" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "port_number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 128,
    "used" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "pon_ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onts" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "pon_port_id" TEXT,
    "serial_number" TEXT NOT NULL,
    "mac" TEXT,
    "description" TEXT,
    "status" "ONTStatus" NOT NULL DEFAULT 'OFFLINE',
    "rx_power" DOUBLE PRECISION,
    "tx_power" DOUBLE PRECISION,
    "last_seen" TIMESTAMP(3),
    "provisioned_at" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nap_box_id" TEXT,
    "speed_profile_id" TEXT,
    "protocol" "Protocol" NOT NULL DEFAULT 'GPON',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "ont_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "service_plan" TEXT,
    "contract_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT,
    "ont_id" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "ack_at" TIMESTAMP(3),
    "ack_by" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_history" (
    "ont_id" TEXT NOT NULL,
    "rx_power" DOUBLE PRECISION,
    "tx_power" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_history_pkey" PRIMARY KEY ("ont_id","timestamp")
);

-- CreateTable
CREATE TABLE "tr069_devices" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "oui" TEXT,
    "product_class" TEXT,
    "manufacturer" TEXT,
    "software_version" TEXT,
    "hardware_version" TEXT,
    "ip_address" TEXT,
    "last_inform" TIMESTAMP(3),
    "connection_request_url" TEXT,
    "ont_id" TEXT,
    "client_id" TEXT,
    "parameters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tr069_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_vlan" INTEGER,
    "voip_vlan" INTEGER,
    "iptv_vlan" INTEGER,
    "speed_down" INTEGER,
    "speed_up" INTEGER,
    "wan_mode" "WANMode" NOT NULL DEFAULT 'DHCP',
    "sip_server" TEXT,
    "multicast_vlan" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ztp_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "service_profile_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ztp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_configs" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "severity_min" "AlertSeverity" NOT NULL DEFAULT 'HIGH',
    "schedule" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speed_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "download_mbps" INTEGER NOT NULL,
    "upload_mbps" INTEGER NOT NULL,
    "burst_down" INTEGER,
    "burst_up" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nap_boxes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "ports_total" INTEGER NOT NULL DEFAULT 16,
    "ports_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nap_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhcp_leases" (
    "id" TEXT NOT NULL,
    "ont_id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "hostname" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dhcp_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "olts_name_key" ON "olts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "olts_ip_key" ON "olts"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "pon_ports_olt_id_port_number_key" ON "pon_ports"("olt_id", "port_number");

-- CreateIndex
CREATE UNIQUE INDEX "onts_serial_number_key" ON "onts"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "clients_ont_id_key" ON "clients"("ont_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_contract_number_key" ON "clients"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "tr069_devices_serial_number_key" ON "tr069_devices"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "tr069_devices_ont_id_key" ON "tr069_devices"("ont_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_profiles_name_key" ON "service_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ztp_profiles_name_key" ON "ztp_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "speed_profiles_name_key" ON "speed_profiles"("name");

-- AddForeignKey
ALTER TABLE "pon_ports" ADD CONSTRAINT "pon_ports_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "olts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onts" ADD CONSTRAINT "onts_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "olts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onts" ADD CONSTRAINT "onts_pon_port_id_fkey" FOREIGN KEY ("pon_port_id") REFERENCES "pon_ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onts" ADD CONSTRAINT "onts_nap_box_id_fkey" FOREIGN KEY ("nap_box_id") REFERENCES "nap_boxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onts" ADD CONSTRAINT "onts_speed_profile_id_fkey" FOREIGN KEY ("speed_profile_id") REFERENCES "speed_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_ont_id_fkey" FOREIGN KEY ("ont_id") REFERENCES "onts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "olts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ont_id_fkey" FOREIGN KEY ("ont_id") REFERENCES "onts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_history" ADD CONSTRAINT "signal_history_ont_id_fkey" FOREIGN KEY ("ont_id") REFERENCES "onts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr069_devices" ADD CONSTRAINT "tr069_devices_ont_id_fkey" FOREIGN KEY ("ont_id") REFERENCES "onts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr069_devices" ADD CONSTRAINT "tr069_devices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ztp_profiles" ADD CONSTRAINT "ztp_profiles_service_profile_id_fkey" FOREIGN KEY ("service_profile_id") REFERENCES "service_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dhcp_leases" ADD CONSTRAINT "dhcp_leases_ont_id_fkey" FOREIGN KEY ("ont_id") REFERENCES "onts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
