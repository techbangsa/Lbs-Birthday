-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BirthdayCampaignSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "birthdayNamespace" TEXT NOT NULL DEFAULT 'custom',
    "birthdayKey" TEXT NOT NULL DEFAULT 'birthday',
    "compareMode" TEXT NOT NULL DEFAULT 'MONTH_DAY',
    "customerTag" TEXT NOT NULL DEFAULT 'birthday',
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
INSERT INTO "new_BirthdayCampaignSettings" ("appliesOncePerCustomer", "appliesToAllItems", "birthdayKey", "birthdayNamespace", "codePrefix", "combinesWithOrderDiscounts", "combinesWithProductDiscounts", "combinesWithShippingDiscounts", "compareMode", "createdAt", "discountValue", "discountValueType", "enabled", "id", "lastDryRunAt", "lastRunAt", "minimumQuantity", "minimumSubtotal", "notificationMode", "termsDescription", "termsTitle", "timezone", "updatedAt", "usageLimit", "validityDays") SELECT "appliesOncePerCustomer", "appliesToAllItems", "birthdayKey", "birthdayNamespace", "codePrefix", "combinesWithOrderDiscounts", "combinesWithProductDiscounts", "combinesWithShippingDiscounts", "compareMode", "createdAt", "discountValue", "discountValueType", "enabled", "id", "lastDryRunAt", "lastRunAt", "minimumQuantity", "minimumSubtotal", "notificationMode", "termsDescription", "termsTitle", "timezone", "updatedAt", "usageLimit", "validityDays" FROM "BirthdayCampaignSettings";
DROP TABLE "BirthdayCampaignSettings";
ALTER TABLE "new_BirthdayCampaignSettings" RENAME TO "BirthdayCampaignSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
