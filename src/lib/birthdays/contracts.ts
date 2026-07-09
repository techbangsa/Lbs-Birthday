import { z } from "zod";

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const compareModes = ["MONTH_DAY", "EXACT_DATE"] as const;
export const runTriggers = ["MANUAL", "CRON"] as const;
export const birthdayTodayTag = "birthday-today";

export const settingsInputSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().trim().min(1).refine(isValidTimeZone, "Enter a valid IANA timezone, for example Asia/Jakarta."),
  birthdayNamespace: z.string().trim().min(1).max(40),
  birthdayKey: z.string().trim().min(1).max(60),
  compareMode: z.enum(compareModes),
});

export const defaultCampaignSettings: CampaignSettingsInput = {
  enabled: false,
  timezone: "Asia/Jakarta",
  birthdayNamespace: "custom",
  birthdayKey: "birthday",
  compareMode: "MONTH_DAY",
};

export const runScanRequestSchema = z.object({
  dryRun: z.boolean().default(false),
  trigger: z.enum(runTriggers).default("MANUAL"),
  pageLimit: z.number().int().positive().max(1000).optional(),
});

export type CampaignSettingsInput = z.infer<typeof settingsInputSchema>;
export type RunScanRequest = z.infer<typeof runScanRequestSchema>;

export type CampaignSettingsDto = CampaignSettingsInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  lastDryRunAt: string | null;
};

export type GeneratedTagResultDto = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  birthdayValue: string;
  birthdayMonthDay: string;
  tag: string;
  action: "ADD" | "REMOVE";
  status: "DRY_RUN" | "CREATED" | "FAILED" | "SKIPPED";
  reason: string | null;
  createdAt: string;
  isDryRun: boolean;
};

export type BirthdayRunDto = {
  id: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  dryRun: boolean;
  trigger: "MANUAL" | "CRON";
  startedAt: string;
  finishedAt: string | null;
  matchedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  summary: string | null;
  errorMessage: string | null;
  results: GeneratedTagResultDto[];
};

export type CustomerListItemDto = {
  id: string;
  displayName: string;
  email: string | null;
  birthdayValue: string | null;
  tags: string[];
};

export type CustomerListResponseDto = {
  customers: CustomerListItemDto[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

export type UpcomingBirthdayDto = {
  id: string;
  displayName: string;
  email: string | null;
  birthdayValue: string;
  birthdayMonthDay: string;
  daysUntil: number;
  daysUntilLabel: string;
  isToday: boolean;
};