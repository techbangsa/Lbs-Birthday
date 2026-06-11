-- CreateTable
CREATE TABLE "BirthdayCampaignSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "birthdayNamespace" TEXT NOT NULL DEFAULT 'custom',
    "birthdayKey" TEXT NOT NULL DEFAULT 'birthday',
    "compareMode" TEXT NOT NULL DEFAULT 'MONTH_DAY',
    "discountValueType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL DEFAULT 10,
    "codePrefix" TEXT NOT NULL DEFAULT 'HBD',
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "appliesOncePerCustomer" BOOLEAN NOT NULL DEFAULT true,
    "appliesToAllItems" BOOLEAN NOT NULL DEFAULT true,
    "minimumSubtotal" REAL,
    "minimumQuantity" INTEGER,
    "combinesWithOrderDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "combinesWithProductDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "combinesWithShippingDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER,
    "notificationMode" TEXT NOT NULL DEFAULT 'NONE',
    "termsTitle" TEXT NOT NULL DEFAULT 'Birthday discount',
    "termsDescription" TEXT NOT NULL DEFAULT 'Use this code during the validity window.',
    "lastRunAt" DATETIME,
    "lastDryRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BirthdayScanRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "GeneratedDiscount" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "reason" TEXT,
    "campaignYear" INTEGER NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDiscount_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BirthdayScanRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BirthdayScanRun_startedAt_idx" ON "BirthdayScanRun"("startedAt");

-- CreateIndex
CREATE INDEX "GeneratedDiscount_runId_idx" ON "GeneratedDiscount"("runId");

-- CreateIndex
CREATE INDEX "GeneratedDiscount_customerId_campaignYear_idx" ON "GeneratedDiscount"("customerId", "campaignYear");
