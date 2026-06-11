"use client";

import {
  Banner,
  BlockStack,
  Checkbox,
  FormLayout,
  Modal,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";

import { birthdayTodayTag, type CampaignSettingsDto, type CampaignSettingsInput } from "@/lib/birthdays/contracts";

type Notice = {
  kind: "success" | "error";
  message: string;
} | null;

type SettingsFormProps = {
  open: boolean;
  settings: CampaignSettingsDto;
  savePending: boolean;
  saveNotice: Notice;
  onClose: () => void;
  onSave: (value: CampaignSettingsInput) => void;
};

export function SettingsForm({
  open,
  settings,
  savePending,
  saveNotice,
  onClose,
  onSave,
}: SettingsFormProps) {
  const [form, setForm] = useState<CampaignSettingsInput>(settings);

  function updateField<Key extends keyof CampaignSettingsInput>(key: Key, value: CampaignSettingsInput[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Campaign settings"
      primaryAction={{
        content: "Save settings",
        onAction: () => onSave(form),
        loading: savePending,
      }}
      secondaryActions={[{ content: "Close", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" tone="subdued">
            Configure birthday matching. Live runs keep the fixed Shopify tag <strong>{birthdayTodayTag}</strong> in sync.
          </Text>

          {saveNotice ? (
            <Banner tone={saveNotice.kind === "success" ? "success" : "critical"}>
              <p>{saveNotice.message}</p>
            </Banner>
          ) : null}

          <FormLayout>
            <Checkbox
              label="Campaign enabled"
              helpText="Disabled campaigns can still use dry-run mode, but live tag updates stay blocked."
              checked={form.enabled}
              onChange={(checked) => updateField("enabled", checked)}
            />

            <Text as="h3" variant="headingSm">
              Matching
            </Text>

            <TextField
              label="Timezone"
              value={form.timezone}
              onChange={(value) => updateField("timezone", value)}
              autoComplete="off"
              helpText="Use an IANA timezone so “today” matches the campaign day."
            />

            <TextField
              label="Metafield namespace"
              value={form.birthdayNamespace}
              onChange={(value) => updateField("birthdayNamespace", value)}
              autoComplete="off"
            />

            <TextField
              label="Metafield key"
              value={form.birthdayKey}
              onChange={(value) => updateField("birthdayKey", value)}
              autoComplete="off"
            />

            <Select
              label="Birthday comparison mode"
              options={[
                { label: "Month and day only", value: "MONTH_DAY" },
                { label: "Exact full date", value: "EXACT_DATE" },
              ]}
              value={form.compareMode}
              onChange={(value) => updateField("compareMode", value as CampaignSettingsInput["compareMode"])}
            />
          </FormLayout>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}