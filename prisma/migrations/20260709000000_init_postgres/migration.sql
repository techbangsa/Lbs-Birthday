-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BirthdayCompareMode" AS ENUM ('MONTH_DAY', 'EXACT_DATE');

-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "NotificationMode" AS ENUM ('NONE', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RunTrigger" AS ENUM ('MANUAL', 'CRON');

-- CreateEnum
CREATE TYPE "GeneratedDiscountStatus" AS ENUM ('DRY_RUN', 'CREATED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "BirthdayCampaignSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "birthdayNamespace" TEXT NOT NULL DEFAULT 'custom',
    "birthdayKey" TEXT NOT NULL DEFAULT 'birthday',
    "compareMode" "BirthdayCompareMode" NOT NULL DEFAULT 'MONTH_DAY',
    "customerTag" TEXT NOT NULL DEFAULT 'birthday',
    "discountValueType" "DiscountValueType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "codePrefix" TEXT NOT NULL DEFAULT 'HBD',
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "appliesOncePerCustomer" BOOLEAN NOT NULL DEFAULT true,
    "appliesToAllItems" BOOLEAN NOT NULL DEFAULT true,
    "minimumSubtotal" DOUBLE PRECISION,
    "minimumQuantity" INTEGER,
    "combinesWithOrderDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "combinesWithProductDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "combinesWithShippingDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER,
    "notificationMode" "NotificationMode" NOT NULL DEFAULT 'NONE',
    "termsTitle" TEXT NOT NULL DEFAULT 'Birthday discount',
    "termsDescription" TEXT NOT NULL DEFAULT 'Use this code during the validity window.',
    "lastRunAt" TIMESTAMP(3),
    "lastDryRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthdayCampaignSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthdayScanRun" (
    "id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "trigger" "RunTrigger" NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "BirthdayScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDiscount" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "birthdayValue" TEXT NOT NULL,
    "birthdayMonthDay" TEXT NOT NULL,
    "discountCode" TEXT NOT NULL,
    "discountTitle" TEXT NOT NULL,
    "shopifyDiscountId" TEXT,
    "shopifyDiscountCodeNodeId" TEXT,
    "status" "GeneratedDiscountStatus" NOT NULL DEFAULT 'CREATED',
    "reason" TEXT,
    "campaignYear" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BirthdayScanRun_startedAt_idx" ON "BirthdayScanRun"("startedAt");

-- CreateIndex
CREATE INDEX "GeneratedDiscount_runId_idx" ON "GeneratedDiscount"("runId");

-- CreateIndex
CREATE INDEX "GeneratedDiscount_customerId_campaignYear_idx" ON "GeneratedDiscount"("customerId", "campaignYear");

-- AddForeignKey
ALTER TABLE "GeneratedDiscount" ADD CONSTRAINT "GeneratedDiscount_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BirthdayScanRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

