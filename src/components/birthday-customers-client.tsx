"use client";

import {
  Badge,
  BlockStack,
  Card,
  Icon,
  IndexTable,
  InlineStack,
  Page,
  Pagination,
  Text,
  TextField,
  Button,
  Box,
} from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";

export type ShopifyBirthdayCustomer = {
  id: string;
  displayName: string;
  email: string | null;
  birthdayValue: string | null;
  tags: string[];
};

type BirthdayCustomersClientProps = {
  initialCustomers: ShopifyBirthdayCustomer[];
};

// Robust date parser to handle YYYY-MM-DD, DD-MM-YYYY, and other delimiters
function parseDate(val: string | null): { date: Date | null; monthDay: string | null; year: number | null } {
  if (!val) return { date: null, monthDay: null, year: null };
  const cleaned = val.trim();

  // Try YYYY-MM-DD
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(cleaned);
  if (match) {
    const y = parseInt(match[1]);
    const m = parseInt(match[2]);
    const d = parseInt(match[3]);
    return {
      date: new Date(y, m - 1, d),
      monthDay: `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      year: y,
    };
  }

  // Try DD-MM-YYYY or MM-DD-YYYY
  match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(cleaned);
  if (match) {
    const first = parseInt(match[1]);
    const second = parseInt(match[2]);
    const y = parseInt(match[3]);

    let d = first;
    let m = second;

    if (first > 12) {
      d = first;
      m = second;
    } else if (second > 12) {
      m = first;
      d = second;
    } else {
      // Default to DD-MM-YYYY (most common in this store's data)
      d = first;
      m = second;
    }

    return {
      date: new Date(y, m - 1, d),
      monthDay: `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      year: y,
    };
  }

  return { date: null, monthDay: null, year: null };
}

// Formats birthday raw string into a readable format, e.g. "May 20, 1995"
function formatBirthday(val: string | null) {
  if (!val) return "Not set";
  const parsed = parseDate(val);
  if (!parsed.date) return val; // Fallback to raw string if parsing fails

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: parsed.year ? "numeric" : undefined,
  });
  return formatter.format(parsed.date);
}

export function BirthdayCustomersClient({ initialCustomers }: BirthdayCustomersClientProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<ShopifyBirthdayCustomer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "email" | "birthday">("birthday");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("ascending");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const itemsPerPage = 25;

  // Handle manual data refresh from Shopify
  function handleRefresh() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/customers/birthdays", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch updated birthday customers list.");
        const data = await response.json();
        if (data.customers) {
          setCustomers(data.customers);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Refresh error:", err);
      }
    });
  }

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const nameMatch = customer.displayName.toLowerCase().includes(query);
      const emailMatch = (customer.email || "").toLowerCase().includes(query);
      const birthdayMatch = (customer.birthdayValue || "").toLowerCase().includes(query);
      const formattedMatch = formatBirthday(customer.birthdayValue).toLowerCase().includes(query);
      const tagsMatch = customer.tags.some((tag) => tag.toLowerCase().includes(query));

      return nameMatch || emailMatch || birthdayMatch || formattedMatch || tagsMatch;
    });
  }, [customers, searchQuery]);

  // Sort customers based on sort key and direction
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "name") {
        comparison = a.displayName.localeCompare(b.displayName);
      } else if (sortKey === "email") {
        const emailA = a.email || "";
        const emailB = b.email || "";
        comparison = emailA.localeCompare(emailB);
      } else if (sortKey === "birthday") {
        const parsedA = parseDate(a.birthdayValue);
        const parsedB = parseDate(b.birthdayValue);

        if (!parsedA.monthDay && !parsedB.monthDay) comparison = 0;
        else if (!parsedA.monthDay) comparison = 1;
        else if (!parsedB.monthDay) comparison = -1;
        else {
          comparison = parsedA.monthDay.localeCompare(parsedB.monthDay);
          // If same month and day, sort by birth year
          if (comparison === 0 && parsedA.year && parsedB.year) {
            comparison = parsedA.year - parsedB.year;
          }
        }
      }

      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [filteredCustomers, sortKey, sortDirection]);

  // Paginated segment of customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage]);

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Handles sort toggles
  function handleSort(index: number, direction: "ascending" | "descending") {
    const keys: Array<"name" | "email" | "birthday"> = ["name", "email", "birthday"];
    setSortKey(keys[index]);
    setSortDirection(direction);
    setCurrentPage(1);
  }

  const headings = [
    { title: "Name" },
    { title: "Email" },
    { title: "Birthday (Calendar Order)" },
    { title: "Tags" },
  ] as [any, ...any[]];


  const sortColumnIndex = ["name", "email", "birthday"].indexOf(sortKey);

  const rowMarkup = paginatedCustomers.map(({ id, displayName, email, birthdayValue, tags }, index) => (
    <IndexTable.Row id={id} key={id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {displayName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{email ?? <Text as="span" tone="subdued">No email</Text>}</IndexTable.Cell>
      <IndexTable.Cell>
        <BlockStack>
          <Text as="span" fontWeight="medium">
            {formatBirthday(birthdayValue)}
          </Text>
          {birthdayValue && birthdayValue !== formatBirthday(birthdayValue) && (
            <Text as="span" variant="bodyXs" tone="subdued">
              Raw: {birthdayValue}
            </Text>
          )}
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="100">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge key={tag} tone="info">
                {tag}
              </Badge>
            ))
          ) : (
            <Text as="span" tone="subdued">-</Text>
          )}
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Birthday Customers"
      subtitle="View, search, and sort all customers who have filled birthday data in their metafields."
      backAction={{ content: "Dashboard", onAction: () => router.push("/") }}
    >
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <div style={{ flex: 1, maxWidth: "480px" }}>
                <TextField
                  label="Search customers"
                  labelHidden
                  value={searchQuery}
                  onChange={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email, birthday, or tags..."
                  prefix={<Icon source={SearchIcon} />}
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                />
              </div>
              <Button
                loading={isPending}
                icon={RefreshIcon}
                onClick={handleRefresh}
              >
                Refresh List
              </Button>
            </InlineStack>

            <IndexTable
              resourceName={{ singular: "customer", plural: "customers" }}
              itemCount={sortedCustomers.length}
              headings={headings}
              selectable={false}
              sortable={[true, true, true, false]}
              sortDirection={sortDirection}
              sortColumnIndex={sortColumnIndex}
              onSort={handleSort}
            >
              {rowMarkup}
            </IndexTable>

            {sortedCustomers.length > 0 ? (
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" tone="subdued">
                  Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, sortedCustomers.length)} of{" "}
                  {sortedCustomers.length} customer{sortedCustomers.length === 1 ? "" : "s"} with birthday filled.
                </Text>
                {totalPages > 1 && (
                  <Pagination
                    hasPrevious={currentPage > 1}
                    onPrevious={() => setCurrentPage((prev) => prev - 1)}
                    hasNext={currentPage < totalPages}
                    onNext={() => setCurrentPage((prev) => prev + 1)}
                  />
                )}
              </InlineStack>
            ) : (
              <InlineStack align="center">
                <Box padding="800">
                  <Text as="p" tone="subdued">
                    No customers found matching search criteria.
                  </Text>
                </Box>
              </InlineStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
