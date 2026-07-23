import "server-only";

import type { CustomerListItemDto } from "@/lib/birthdays/contracts";
import { db } from "@/lib/db";

export type BirthdayCustomerCacheRow = {
  customerId: string;
  displayName: string;
  email: string | null;
  birthdayValue: string;
  monthDay: string;
  tags: string[];
};

/**
 * Swap the cache for a fresh snapshot. Only call this after walking every
 * customer in the store, otherwise the missing ones look like deletions.
 */
export async function replaceBirthdayCustomerCache(rows: BirthdayCustomerCacheRow[]) {
  const syncedAt = new Date();

  await db.$transaction([
    db.birthdayCustomer.deleteMany({}),
    db.birthdayCustomer.createMany({
      data: rows.map((row) => ({ ...row, syncedAt })),
    }),
  ]);
}

export async function listCachedBirthdayCustomers(): Promise<CustomerListItemDto[]> {
  const customers = await db.birthdayCustomer.findMany({
    orderBy: { displayName: "asc" },
  });

  return customers.map((customer) => ({
    id: customer.customerId,
    displayName: customer.displayName,
    email: customer.email,
    birthdayValue: customer.birthdayValue,
    tags: customer.tags,
  }));
}
