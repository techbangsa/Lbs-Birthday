import { Badge, BlockStack, Card, InlineStack, Text } from "@shopify/polaris";

import type { BirthdayRunDto } from "@/lib/birthdays/contracts";

// The timezone must be pinned to the campaign's. Left to the runtime default,
// the server formats in UTC and the browser in the viewer's local zone, and the
// two renders disagree during hydration.
function formatDate(value: string | null, timeZone: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function getRunLabel(run: BirthdayRunDto) {
  if (run.status === "FAILED") {
    return "Failed";
  }

  if (run.status === "RUNNING") {
    return "Running";
  }

  return "Done";
}

function getRunHeadline(run: BirthdayRunDto) {
  if (run.status === "FAILED") {
    return run.dryRun ? "Preview failed before finishing." : "Live run failed before finishing.";
  }

  if (run.status === "RUNNING") {
    return run.dryRun ? "Preview is still checking customers." : "Live run is still updating customer tags.";
  }

  if (run.dryRun) {
    return run.createdCount > 0
      ? `Preview found ${run.createdCount} customer tag update${run.createdCount === 1 ? "" : "s"}.`
      : "Preview found no tag updates.";
  }

  return run.createdCount > 0
    ? `Updated ${run.createdCount} customer tag${run.createdCount === 1 ? "" : "s"}.`
    : "Live run finished without any tag changes.";
}

function getRunStats(run: BirthdayRunDto) {
  const stats = [
    `Matched ${run.matchedCount}`,
    run.dryRun ? `Planned ${run.createdCount}` : `Updated ${run.createdCount}`,
  ];

  if (run.skippedCount > 0) {
    stats.push(`Skipped ${run.skippedCount}`);
  }

  if (run.failedCount > 0) {
    stats.push(`Failed ${run.failedCount}`);
  }

  return stats.join(" · ");
}

function getTagSummary(run: BirthdayRunDto) {
  const result = run.results[0];

  if (!result) {
    return null;
  }

  const customerLabel = result.customerName ?? result.customerEmail ?? "This customer";

  if (run.dryRun) {
    return result.action === "ADD"
      ? `${customerLabel} would receive tag ${result.tag}.`
      : `${customerLabel} would have tag ${result.tag} removed.`;
  }

  return result.action === "ADD"
    ? `${customerLabel} received tag ${result.tag}.`
    : `${customerLabel} had tag ${result.tag} removed.`;
}

export function RunHistory({ runs, timeZone }: { runs: BirthdayRunDto[]; timeZone: string }) {
  return (
    <BlockStack gap="300">
      <Card>
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Recent checks
          </Text>
          <Text as="p" tone="subdued">
            This is the activity log for your birthday scans. Preview shows tag changes only. Live runs add or remove the birthday-today tag.
          </Text>
        </BlockStack>
      </Card>

      {runs.length === 0 ? (
        <Card>
          <Text as="p" tone="subdued">
            No scan activity yet. Start with a preview after reviewing the customer list.
          </Text>
        </Card>
      ) : (
        runs.map((run) => (
          <Card key={run.id}>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Badge>{run.dryRun ? "Preview" : "Live"}</Badge>
                <Text as="p" tone="subdued">
                  {getRunLabel(run)}
                </Text>
              </InlineStack>

              <BlockStack gap="100">
                <Text as="h3" variant="bodyMd" fontWeight="semibold">
                  {getRunHeadline(run)}
                </Text>
                <Text as="p" tone="subdued">
                  Started {formatDate(run.startedAt, timeZone)}
                  {run.finishedAt ? ` · Finished ${formatDate(run.finishedAt, timeZone)}` : ""}
                </Text>
                <Text as="p" tone="subdued">
                  {getRunStats(run)}
                </Text>
                {run.errorMessage ? (
                  <Text as="p" tone="critical">
                    {run.errorMessage}
                  </Text>
                ) : null}
                {getTagSummary(run) ? (
                  <Text as="p" tone="subdued">
                    {getTagSummary(run)}
                  </Text>
                ) : null}
              </BlockStack>

              {run.results.length > 0 ? (
                <BlockStack gap="200">
                  {run.results.slice(0, 2).map((result) => (
                    <BlockStack key={result.id} gap="050">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {result.customerName ?? result.customerEmail ?? result.customerId}
                        </Text>
                        <InlineStack gap="100">
                          <Badge>{result.action}</Badge>
                          <Badge>{result.status}</Badge>
                        </InlineStack>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        {result.tag} · {result.birthdayValue}
                      </Text>
                      {result.reason ? (
                        <Text as="p" tone="subdued">
                          {result.reason}
                        </Text>
                      ) : null}
                    </BlockStack>
                  ))}
                </BlockStack>
              ) : null}
            </BlockStack>
          </Card>
        ))
      )}
    </BlockStack>
  );
}