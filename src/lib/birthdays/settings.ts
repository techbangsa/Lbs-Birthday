import "server-only";

import type { BirthdayCampaignSettings } from "@prisma/client";

import {
  defaultCampaignSettings,
  settingsInputSchema,
  type CampaignSettingsDto,
  type CampaignSettingsInput,
} from "@/lib/birthdays/contracts";
import { db } from "@/lib/db";

function serializeSettings(settings: BirthdayCampaignSettings): CampaignSettingsDto {
  return {
    id: settings.id,
    enabled: settings.enabled,
    timezone: settings.timezone,
    birthdayNamespace: settings.birthdayNamespace,
    birthdayKey: settings.birthdayKey,
    compareMode: settings.compareMode,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
    lastRunAt: settings.lastRunAt?.toISOString() ?? null,
    lastDryRunAt: settings.lastDryRunAt?.toISOString() ?? null,
  };
}

async function ensureSettingsRow() {
  return db.birthdayCampaignSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ...defaultCampaignSettings,
    },
  });
}

export async function getCampaignSettingsModel() {
  return ensureSettingsRow();
}

export async function getCampaignSettings() {
  const settings = await ensureSettingsRow();
  return serializeSettings(settings);
}

export async function updateCampaignSettings(input: CampaignSettingsInput) {
  const parsed = settingsInputSchema.parse(input);

  const settings = await db.birthdayCampaignSettings.upsert({
    where: { id: 1 },
    update: parsed,
    create: {
      id: 1,
      ...defaultCampaignSettings,
      ...parsed,
    },
  });

  return serializeSettings(settings);
}