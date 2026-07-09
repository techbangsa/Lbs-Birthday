"use client";

import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineStack,
  SkeletonBodyText,
  Text,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";

import type { UpcomingBirthdayDto } from "@/lib/birthdays/contracts";

function formatBirthdayDisplay(monthDay: string) {
  const [month, day] = monthDay.split("-").map(Number);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[month - 1]} ${day}`;
}

export function UpcomingBirthdays() {
  const [upcoming, setUpcoming] = useState<UpcomingBirthdayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customers/upcoming-birthdays", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load upcoming birthdays.");
      }

      const data = (await response.json()) as UpcomingBirthdayDto[];
      setUpcoming(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load upcoming birthdays.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUpcoming();
  }, [fetchUpcoming]);

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            🎂 Upcoming birthdays
          </Text>
          <Button
            variant="plain"
            onClick={() => void fetchUpcoming()}
            disabled={loading}
          >
            Refresh
          </Button>
        </InlineStack>
        <Text as="p" tone="subdued">
          The next 5 customers with birthdays closest to today.
        </Text>

        {loading ? (
          <SkeletonBodyText lines={5} />
        ) : error ? (
          <Text as="p" tone="critical">
            {error}
          </Text>
        ) : upcoming.length === 0 ? (
          <Text as="p" tone="subdued">
            No customers with birthday data found.
          </Text>
        ) : (
          <BlockStack gap="200">
            {upcoming.map((customer: UpcomingBirthdayDto) => (
              <Card key={customer.id}>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="h3" variant="bodyMd" fontWeight="semibold">
                      {customer.displayName}
                    </Text>
                    <Text as="p" tone="subdued">
                      {customer.email ?? "No email address"}
                    </Text>
                  </BlockStack>

                  <BlockStack gap="050" inlineAlign="end">
                    <Text as="p" variant="bodyMd">
                      {formatBirthdayDisplay(customer.birthdayMonthDay)}
                    </Text>
                    <Badge tone={customer.isToday ? "success" : customer.daysUntil <= 7 ? "attention" : undefined}>
                      {customer.daysUntilLabel}
                    </Badge>
                  </BlockStack>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
