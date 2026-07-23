-- CreateTable
CREATE TABLE "BirthdayCustomer" (
    "customerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "birthdayValue" TEXT NOT NULL,
    "monthDay" TEXT NOT NULL,
    "tags" TEXT[],
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BirthdayCustomer_pkey" PRIMARY KEY ("customerId")
);

-- CreateIndex
CREATE INDEX "BirthdayCustomer_monthDay_idx" ON "BirthdayCustomer"("monthDay");

