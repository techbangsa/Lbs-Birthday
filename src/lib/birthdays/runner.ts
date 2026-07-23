import "server-only";

import type { BirthdayScanRun, GeneratedDiscount } from "@prisma/client";

import { birthdayTodayTag, type BirthdayRunDto, type GeneratedTagResultDto } from "@/lib/birthdays/contracts";
import { replaceBirthdayCustomerCache, type BirthdayCustomerCacheRow } from "@/lib/birthdays/customer-cache";
import { birthdayMatchesToday, getCampaignYear, parseBirthdayValue } from "@/lib/birthdays/matcher";
import { getCampaignSettings, getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { db } from "@/lib/db";
import { iterateCustomers } from "@/lib/shopify/customers";
import { addCustomerTag, removeCustomerTag } from "@/lib/shopify/tags";

type TagSyncAction = "ADD" | "REMOVE";

function serializeGeneratedDiscount(discount: GeneratedDiscount): GeneratedTagResultDto {
  return {
    id: discount.id,
    customerId: discount.customerId,
    customerName: discount.customerName,
    customerEmail: discount.customerEmail,
    birthdayValue: discount.birthdayValue,
    birthdayMonthDay: discount.birthdayMonthDay,
    tag: discount.discountCode,
    action: discount.discountTitle === "REMOVE" ? "REMOVE" : "ADD",
    status: discount.status,
    reason: discount.reason,
    createdAt: discount.createdAt.toISOString(),
    isDryRun: discount.isDryRun,
  };
}

function serializeBirthdayRun(
  run: BirthdayScanRun & {
    discounts: GeneratedDiscount[];
  },
): BirthdayRunDto {
  return {
    id: run.id,
    status: run.status,
    dryRun: run.dryRun,
    trigger: run.trigger,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    matchedCount: run.matchedCount,
    createdCount: run.createdCount,
    skippedCount: run.skippedCount,
    failedCount: run.failedCount,
    summary: run.summary,
    errorMessage: run.errorMessage,
    results: run.discounts.map(serializeGeneratedDiscount),
  };
}

async function finalizeRun(
  runId: string,
  data: {
    status: "COMPLETED" | "FAILED";
    matchedCount: number;
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    summary: string;
    errorMessage?: string | null;
  },
) {
  return db.birthdayScanRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      finishedAt: new Date(),
      matchedCount: data.matchedCount,
      createdCount: data.createdCount,
      skippedCount: data.skippedCount,
      failedCount: data.failedCount,
      summary: data.summary,
      errorMessage: data.errorMessage ?? null,
    },
    include: {
      discounts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function listBirthdayRuns(limit = 8) {
  const runs = await db.birthdayScanRun.findMany({
    orderBy: {
      startedAt: "desc",
    },
    take: limit,
    include: {
      discounts: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  return runs.map(serializeBirthdayRun);
}

function buildTagReason(action: TagSyncAction, customerHasBirthdayToday: boolean) {
  if (action === "ADD") {
    return `Customer has a birthday today and should receive tag "${birthdayTodayTag}".`;
  }

  if (customerHasBirthdayToday) {
    return `Customer already had tag "${birthdayTodayTag}" and stays tagged today.`;
  }

  return `Customer does not have a birthday today, so tag "${birthdayTodayTag}" should be removed.`;
}

async function recordTagSyncResult({
  runId,
  customerId,
  customerName,
  customerEmail,
  birthdayValue,
  birthdayMonthDay,
  action,
  status,
  reason,
  campaignYear,
  now,
  dryRun,
}: {
  runId: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  birthdayValue: string | null;
  birthdayMonthDay: string;
  action: TagSyncAction;
  status: "DRY_RUN" | "CREATED" | "FAILED" | "SKIPPED";
  reason: string | null;
  campaignYear: number;
  now: Date;
  dryRun: boolean;
}) {
  await db.generatedDiscount.create({
    data: {
      runId,
      customerId,
      customerName,
      customerEmail,
      birthdayValue: birthdayValue ?? "Not set",
      birthdayMonthDay,
      discountCode: birthdayTodayTag,
      discountTitle: action,
      status,
      reason,
      campaignYear,
      validFrom: now,
      validUntil: null,
      isDryRun: dryRun,
    },
  });
}

export async function runBirthdayScan({
  dryRun,
  trigger,
  pageLimit,
  existingRunId,
}: {
  dryRun: boolean;
  trigger: "MANUAL" | "CRON";
  pageLimit?: number;
  existingRunId?: string;
}) {
  const settingsModel = await getCampaignSettingsModel();
  const settings = await getCampaignSettings();

  const run = existingRunId
    ? await db.birthdayScanRun.findUniqueOrThrow({
        where: { id: existingRunId },
        include: { discounts: true },
      })
    : await db.birthdayScanRun.create({
        data: {
          dryRun,
          trigger,
        },
        include: {
          discounts: true,
        },
      });

  let matchedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let addCount = 0;
  let removeCount = 0;
  const birthdayCustomers: BirthdayCustomerCacheRow[] = [];
  const now = new Date();
  const campaignYear = getCampaignYear(now, settings.timezone);

  if (!dryRun && !settings.enabled) {
    const completedRun = await finalizeRun(run.id, {
      status: "COMPLETED",
      matchedCount,
      createdCount,
      skippedCount,
      failedCount,
      summary: `Campaign disabled. No changes were made to tag "${birthdayTodayTag}".`,
    });

    return serializeBirthdayRun(completedRun);
  }

  try {
    for await (const customer of iterateCustomers({
      namespace: settingsModel.birthdayNamespace,
      key: settingsModel.birthdayKey,
      pageLimit,
    })) {
      const parsedBirthday = customer.birthdayValue ? parseBirthdayValue(customer.birthdayValue) : null;
      const birthdayMonthDay = parsedBirthday?.monthDay ?? "Unknown";

      if (customer.birthdayValue && parsedBirthday) {
        birthdayCustomers.push({
          customerId: customer.id,
          displayName: customer.displayName,
          email: customer.email,
          birthdayValue: customer.birthdayValue,
          monthDay: parsedBirthday.monthDay,
          tags: customer.tags,
        });
      }

      const customerHasBirthdayToday =
        customer.birthdayValue !== null &&
        birthdayMatchesToday({
          birthdayValue: customer.birthdayValue,
          compareMode: settings.compareMode,
          timeZone: settings.timezone,
          now,
        });
      const alreadyTagged = customer.tags.includes(birthdayTodayTag);

      if (customerHasBirthdayToday) {
        matchedCount += 1;
      }

      const nextAction: TagSyncAction | null = customerHasBirthdayToday
        ? alreadyTagged
          ? null
          : "ADD"
        : alreadyTagged
          ? "REMOVE"
          : null;

      if (!nextAction) {
        skippedCount += 1;
        continue;
      }

      if (dryRun) {
        createdCount += 1;
        if (nextAction === "ADD") {
          addCount += 1;
        } else {
          removeCount += 1;
        }

        await recordTagSyncResult({
          runId: run.id,
          customerId: customer.id,
          customerName: customer.displayName,
          customerEmail: customer.email,
          birthdayValue: customer.birthdayValue,
          birthdayMonthDay,
          action: nextAction,
          status: "DRY_RUN",
          reason: buildTagReason(nextAction, customerHasBirthdayToday),
          campaignYear,
          now,
          dryRun: true,
        });

        continue;
      }

      try {
        if (nextAction === "ADD") {
          await addCustomerTag(customer.id, birthdayTodayTag);
          addCount += 1;
        } else {
          await removeCustomerTag(customer.id, birthdayTodayTag);
          removeCount += 1;
        }

        createdCount += 1;

        await recordTagSyncResult({
          runId: run.id,
          customerId: customer.id,
          customerName: customer.displayName,
          customerEmail: customer.email,
          birthdayValue: customer.birthdayValue,
          birthdayMonthDay,
          action: nextAction,
          status: "CREATED",
          reason: buildTagReason(nextAction, customerHasBirthdayToday),
          campaignYear,
          now,
          dryRun: false,
        });
      } catch (error) {
        failedCount += 1;

        await recordTagSyncResult({
          runId: run.id,
          customerId: customer.id,
          customerName: customer.displayName,
          customerEmail: customer.email,
          birthdayValue: customer.birthdayValue,
          birthdayMonthDay,
          action: nextAction,
          status: "FAILED",
          reason: error instanceof Error ? error.message : "Unknown Shopify tag sync error.",
          campaignYear,
          now,
          dryRun: false,
        });
      }
    }

    // A page-limited run only sees part of the store, so the customers it did
    // not reach would look like they lost their birthday. Only a full walk is
    // allowed to replace the snapshot.
    if (pageLimit === undefined) {
      await replaceBirthdayCustomerCache(birthdayCustomers);
    }

    await db.birthdayCampaignSettings.update({
      where: { id: 1 },
      data: dryRun ? { lastDryRunAt: now } : { lastRunAt: now },
    });

    const summary = dryRun
      ? `Dry run complete${pageLimit ? ` on the first ${pageLimit} customer page(s)` : ""}. ${addCount} customer(s) would gain "${birthdayTodayTag}" and ${removeCount} would lose it.`
      : `Run complete. Added "${birthdayTodayTag}" to ${addCount} customer(s) and removed it from ${removeCount}.`;

    const completedRun = await finalizeRun(run.id, {
      status: "COMPLETED",
      matchedCount,
      createdCount,
      skippedCount,
      failedCount,
      summary,
    });

    return serializeBirthdayRun(completedRun);
  } catch (error) {
    const failedRun = await finalizeRun(run.id, {
      status: "FAILED",
      matchedCount,
      createdCount,
      skippedCount,
      failedCount,
      summary: "Birthday scan failed before completion.",
      errorMessage: error instanceof Error ? error.message : "Unknown scan failure.",
    });

    return serializeBirthdayRun(failedRun);
  }
}