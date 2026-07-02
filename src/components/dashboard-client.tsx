"use client";

import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { useState, useTransition } from "react";

import { RunHistory } from "@/components/run-history";
import { SettingsForm } from "@/components/settings-form";
import type {
  BirthdayRunDto,
  CampaignSettingsDto,
  CampaignSettingsInput,
  CustomerListItemDto,
  CustomerListResponseDto,
} from "@/lib/birthdays/contracts";
import { birthdayTodayTag } from "@/lib/birthdays/contracts";

type SaveNotice = {
  kind: "success" | "error";
  message: string;
} | null;

type RunNotice = {
  kind: "success" | "error" | "info";
  message: string;
} | null;

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

export function DashboardClient({
  initialSettings,
  initialRuns,
  initialCustomerPage,
}: {
  initialSettings: CampaignSettingsDto;
  initialRuns: BirthdayRunDto[];
  initialCustomerPage: CustomerListResponseDto;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [runs, setRuns] = useState(initialRuns);
  const [customers, setCustomers] = useState(initialCustomerPage.customers);
  const [customerPageInfo, setCustomerPageInfo] = useState(initialCustomerPage.pageInfo);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(null);
  const [runNotice, setRunNotice] = useState<RunNotice>(null);
  const [activeRunMode, setActiveRunMode] = useState<"dry" | "live" | null>(null);
  const [savePending, startSaveTransition] = useTransition();
  const [runPending, startRunTransition] = useTransition();
  const [customersPending, startCustomersTransition] = useTransition();

  async function refreshDashboard() {
    const [nextSettingsResponse, nextRunsResponse] = await Promise.all([
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/runs", { cache: "no-store" }),
    ]);

    if (!nextSettingsResponse.ok || !nextRunsResponse.ok) {
      throw new Error("Could not refresh the dashboard after the last action.");
    }

    const [nextSettings, nextRuns] = await Promise.all([
      readJson<CampaignSettingsDto>(nextSettingsResponse),
      readJson<BirthdayRunDto[]>(nextRunsResponse),
    ]);

    setSettings(nextSettings);
    setRuns(nextRuns);
  }

  async function refreshCustomers(reset = false) {
    const query = new URLSearchParams({ limit: "25" });

    if (!reset && customerPageInfo.endCursor) {
      query.set("after", customerPageInfo.endCursor);
    }

    const response = await fetch(`/api/customers?${query.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not load customers from Shopify.");
    }

    const nextPage = await readJson<CustomerListResponseDto>(response);

    setCustomers((current) => (reset ? nextPage.customers : [...current, ...nextPage.customers]));
    setCustomerPageInfo(nextPage.pageInfo);
  }

  function handleSave(value: CampaignSettingsInput) {
    startSaveTransition(() => {
      void (async () => {
        setSaveNotice(null);

        try {
          const response = await fetch("/api/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          });

          const payload = await readJson<CampaignSettingsDto | { message?: string }>(response);

          if (!response.ok || !("id" in payload)) {
            setSaveNotice({
              kind: "error",
              message: "message" in payload && payload.message ? payload.message : "Could not save the campaign settings.",
            });
            return;
          }

          setSettings(payload);
          await refreshCustomers(true);
          setSettingsModalOpen(false);
          setSaveNotice({
            kind: "success",
            message: "Campaign settings saved.",
          });
        } catch (error) {
          setSaveNotice({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not save the campaign settings.",
          });
        }
      })();
    });
  }

  function handleLoadMoreCustomers() {
    startCustomersTransition(() => {
      void (async () => {
        try {
          await refreshCustomers();
        } catch (error) {
          setRunNotice({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not load more customers.",
          });
        }
      })();
    });
  }

  function customerBirthdayStatus(customer: CustomerListItemDto) {
    return customer.birthdayValue ? "Birthday saved" : "Birthday missing";
  }

  function customerTagStatus(customer: CustomerListItemDto) {
    return customer.tags.includes(birthdayTodayTag) ? "Tagged today" : "Not tagged today";
  }

  function handleRun({ dryRun }: { dryRun: boolean }) {
    startRunTransition(() => {
      void (async () => {
        setActiveRunMode(dryRun ? "dry" : "live");
        setRunNotice({
          kind: "info",
          message: dryRun
            ? "Preview started. Checking customers and planning birthday-today tag changes."
            : "Live run started. Scanning customers and syncing the birthday-today tag. This can take a bit.",
        });

        try {
          const response = await fetch("/api/jobs/birthday-scan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dryRun,
              trigger: "MANUAL",
              pageLimit: dryRun ? 5 : undefined,
            }),
          });

          const payload = await readJson<BirthdayRunDto | { message?: string }>(response);

          if (!response.ok && !("id" in payload)) {
            setRunNotice({
              kind: "error",
              message: "message" in payload && payload.message ? payload.message : "The birthday scan did not complete.",
            });
            return;
          }

          await Promise.all([refreshDashboard(), refreshCustomers(true)]);

          if ("summary" in payload) {
            setRunNotice({
              kind: response.ok ? "success" : "error",
              message: payload.summary ?? (response.ok ? "Birthday scan finished." : "The birthday scan failed."),
            });
          }
        } catch (error) {
          setRunNotice({
            kind: "error",
            message: error instanceof Error ? error.message : "The birthday scan did not complete.",
          });
        } finally {
          setActiveRunMode(null);
        }
      })();
    });
  }

  return (
    <Page
      title="Birthday customer tagging"
      subtitle="Review birthday customers, keep campaign settings in a popup, and sync the birthday-today tag from one screen."
      secondaryActions={[
        {
          content: "View Birthday Customers",
          url: "/customers",
        },
      ]}
    >

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {saveNotice ? (
              <Banner
                tone={saveNotice.kind === "success" ? "success" : "critical"}
                onDismiss={() => setSaveNotice(null)}
              >
                <p>{saveNotice.message}</p>
              </Banner>
            ) : null}

            {runNotice ? (
              <Banner
                tone={runNotice.kind === "success" ? "success" : runNotice.kind === "info" ? "info" : "critical"}
                onDismiss={() => setRunNotice(null)}
              >
                <p>{runNotice.message}</p>
              </Banner>
            ) : null}

            {runPending ? (
              <Card>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    {activeRunMode === "dry" ? "Preview in progress" : "Live run in progress"}
                  </Text>
                  <Text as="p" tone="subdued">
                    {activeRunMode === "dry"
                      ? "The app is checking customers and preparing the birthday-today add/remove plan."
                      : "The app is checking customers and updating the birthday-today tag where needed."}
                  </Text>
                </BlockStack>
              </Card>
            ) : null}

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Customers
                    </Text>
                    <Text as="p" tone="subdued">
                      The first screen now shows customers directly. Birthday values are read from {settings.birthdayNamespace}.
                      {settings.birthdayKey}, and live runs keep {birthdayTodayTag} aligned with who has a birthday today.
                    </Text>
                  </BlockStack>

                  <InlineStack gap="200" blockAlign="center">
                    <Button onClick={() => setSettingsModalOpen(true)}>Campaign settings</Button>
                    <Button disabled={runPending || customersPending} loading={runPending} onClick={() => handleRun({ dryRun: true })}>
                      {runPending && activeRunMode === "dry" ? "Running preview" : "Dry run"}
                    </Button>
                    <Button
                      variant="primary"
                      disabled={runPending || customersPending}
                      loading={runPending}
                      onClick={() => handleRun({ dryRun: false })}
                    >
                      {runPending && activeRunMode === "live" ? "Running live sync" : "Run live"}
                    </Button>
                  </InlineStack>
                </InlineStack>

                <InlineStack gap="200">
                  <Badge>{`Metafield: ${settings.birthdayNamespace}.${settings.birthdayKey}`}</Badge>
                  <Badge>{settings.compareMode === "MONTH_DAY" ? "Month/day matching" : "Exact date matching"}</Badge>
                  <Badge>{`Tag: ${birthdayTodayTag}`}</Badge>
                </InlineStack>

                <BlockStack gap="200">
                  {customers.map((customer) => (
                    <Card key={customer.id}>
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h3" variant="bodyMd" fontWeight="semibold">
                            {customer.displayName}
                          </Text>
                          <Text as="p" tone="subdued">
                            {customer.email ?? "No email address"}
                          </Text>
                        </BlockStack>

                        <BlockStack gap="100" inlineAlign="end">
                          <Text as="p" variant="bodyMd">
                            {customer.birthdayValue ?? "Not set"}
                          </Text>
                          <InlineStack gap="100">
                            <Badge>{customerBirthdayStatus(customer)}</Badge>
                            <Badge>{customerTagStatus(customer)}</Badge>
                          </InlineStack>
                        </BlockStack>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" tone="subdued">
                    Loaded {customers.length} customer{customers.length === 1 ? "" : "s"} from Shopify.
                    {customerPageInfo.hasNextPage ? " More customers are available." : " End of current list."}
                  </Text>

                  {customerPageInfo.hasNextPage ? (
                    <Button loading={customersPending} onClick={handleLoadMoreCustomers}>
                      Load more customers
                    </Button>
                  ) : null}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <RunHistory runs={runs} />
        </Layout.Section>
      </Layout>

      <SettingsForm
        key={settings.updatedAt}
        open={settingsModalOpen}
        settings={settings}
        savePending={savePending}
        saveNotice={saveNotice}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSave}
      />
    </Page>
  );
}