-- AlterTable
ALTER TABLE "olts" ADD COLUMN     "hw_version" TEXT,
ADD COLUMN     "iptv_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "pon_type" TEXT DEFAULT 'GPON',
ADD COLUMN     "snmp_read" TEXT,
ADD COLUMN     "snmp_write" TEXT,
ADD COLUMN     "sw_version" TEXT,
ADD COLUMN     "tcp_port" INTEGER,
ADD COLUMN     "telnet_pass" TEXT,
ADD COLUMN     "telnet_user" TEXT,
ADD COLUMN     "udp_port" INTEGER;

-- AlterTable
ALTER TABLE "onts" ADD COLUMN     "bias_current" DOUBLE PRECISION,
ADD COLUMN     "distance" INTEGER,
ADD COLUMN     "firmware" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "olt_rx_power" DOUBLE PRECISION,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "uptime" BIGINT,
ADD COLUMN     "vlan" INTEGER,
ADD COLUMN     "voltage" DOUBLE PRECISION;
