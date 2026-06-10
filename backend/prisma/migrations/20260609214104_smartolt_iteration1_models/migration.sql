-- DropIndex
DROP INDEX "speed_profiles_name_key";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "action_type" TEXT,
ADD COLUMN     "target_type" TEXT;

-- AlterTable
ALTER TABLE "nap_boxes" ADD COLUMN     "odb_port" INTEGER,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "onts" ADD COLUMN     "board" INTEGER,
ADD COLUMN     "channel" INTEGER,
ADD COLUMN     "configuration_method" TEXT,
ADD COLUMN     "contact" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "mgmt_ip" TEXT,
ADD COLUMN     "odb" TEXT,
ADD COLUMN     "onu_id" INTEGER,
ADD COLUMN     "port" INTEGER,
ADD COLUMN     "pppoe_user" TEXT,
ADD COLUMN     "sw_version" TEXT,
ADD COLUMN     "wan_mode" TEXT,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "speed_profiles" ADD COLUMN     "direction" TEXT,
ADD COLUMN     "forPonType" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ont_count" INTEGER,
ADD COLUMN     "speedKbps" INTEGER,
ADD COLUMN     "type" TEXT,
ALTER COLUMN "download_mbps" SET DEFAULT 0,
ALTER COLUMN "upload_mbps" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "auto_action_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "olts" TEXT,
    "boards" TEXT,
    "ports" TEXT,
    "ponType" TEXT,
    "snPattern" TEXT,
    "onuTypeId" TEXT,
    "fallbackOnuTypeId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT,
    "svlanId" INTEGER,
    "cvlanId" INTEGER,
    "tagTransform" TEXT,
    "downloadSpeed" INTEGER,
    "uploadSpeed" INTEGER,
    "zoneId" TEXT,
    "odbId" TEXT,
    "webUser" TEXT,
    "webPassword" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_action_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "oltId" TEXT,
    "board" INTEGER,
    "port" INTEGER,
    "ponType" TEXT,
    "snPattern" TEXT,
    "onuTypeId" TEXT,
    "fallbackOnuTypeId" TEXT,
    "mode" TEXT,
    "svlanId" INTEGER,
    "cvlanId" INTEGER,
    "tagTransform" TEXT,
    "downloadSpeedId" TEXT,
    "uploadSpeedId" TEXT,
    "zoneId" TEXT,
    "odbId" TEXT,
    "webUser" TEXT,
    "webPassword" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorization_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_threshold_config" (
    "id" TEXT NOT NULL,
    "variationThreshold" DOUBLE PRECISION DEFAULT 3.0,
    "largeVariationDelta" DOUBLE PRECISION DEFAULT 5.0,
    "multiOnuThreshold" INTEGER DEFAULT 3,
    "trendWindowHours" INTEGER DEFAULT 24,
    "trendMinEvents" INTEGER DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signal_threshold_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "restrictionGroup" TEXT,
    "allowedIPs" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olt_subscriptions" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "endDate" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olt_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "group" TEXT NOT NULL DEFAULT 'noc',
    "status" TEXT NOT NULL DEFAULT 'active',
    "twofa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "twofa_secret" TEXT,
    "remember_token" TEXT,
    "ip_access" TEXT,
    "installer_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onu_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ponType" TEXT,
    "channels" INTEGER,
    "ethernetPorts" INTEGER,
    "wifiBands" TEXT,
    "voipPorts" INTEGER,
    "hasCATV" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomProfiles" BOOLEAN NOT NULL DEFAULT false,
    "capability" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onu_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vpn_tunnels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oltIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subnet" TEXT,
    "connected" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vpn_tunnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tr069_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acsUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "oltIds" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr069_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "olt_subscriptions_olt_id_key" ON "olt_subscriptions"("olt_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onu_types_name_key" ON "onu_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "speed_profiles_name_direction_key" ON "speed_profiles"("name", "direction");

