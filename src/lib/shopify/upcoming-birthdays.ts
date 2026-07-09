import "server-only";

import type { UpcomingBirthdayDto } from "@/lib/birthdays/contracts";
import { getDatePartsInTimeZone, parseBirthdayValue } from "@/lib/birthdays/matcher";
import { getBirthdayCustomers } from "@/lib/shopify/customers";

/**
 * Compute the number of days until the next occurrence of a birthday (month/day),
 * relative to today. Returns 0 if the birthday is today.
 */
function daysUntilBirthday(
  birthdayMonth: number,
  birthdayDay: number,
  todayMonth: number,
  todayDay: number,
  todayYear: number,
): number {
  const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
  let birthdayDate = new Date(todayYear, birthdayMonth - 1, birthdayDay);

  if (birthdayDate < todayDate) {
    birthdayDate = new Date(todayYear + 1, birthdayMonth - 1, birthdayDay);
  }

  const diffMs = birthdayDate.getTime() - todayDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a relative label for how many days until the birthday.
 */
function formatDaysUntil(days: number): string {
  if (days === 0) return "Today 🎂";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "In 1 week" : `In ${weeks} weeks`;
  }
  if (days <= 60) return "In about 1 month";
  const months = Math.round(days / 30);
  return `In ${months} months`;
}

export async function getUpcomingBirthdays({
  namespace,
  key,
  timeZone,
  limit = 5,
}: {
  namespace: string;
  key: string;
  timeZone: string;
  limit?: number;
}): Promise<UpcomingBirthdayDto[]> {
  const now = new Date();
  const today = getDatePartsInTimeZone(now, timeZone);

  // Fetch all customers that have a birthday metafield set (~205 customers).
  // This reuses the same function as the /customers page, which is proven to work.
  const customers = await getBirthdayCustomers({ namespace, key });

  const candidates: Array<{
    id: string;
    displayName: string;
    email: string | null;
    birthdayValue: string;
    monthDay: string;
    daysUntil: number;
  }> = [];

  for (const customer of customers) {
    if (!customer.birthdayValue) continue;

    const parsed = parseBirthdayValue(customer.birthdayValue);
    if (!parsed) continue;

    const days = daysUntilBirthday(parsed.month, parsed.day, today.month, today.day, today.year);

    candidates.push({
      id: customer.id,
      displayName: customer.displayName,
      email: customer.email,
      birthdayValue: customer.birthdayValue,
      monthDay: parsed.monthDay,
      daysUntil: days,
    });
  }

  // Sort by days until birthday (ascending), then by name for ties
  candidates.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.displayName.localeCompare(b.displayName);
  });

  // Take the closest N
  return candidates.slice(0, limit).map((c) => ({
    id: c.id,
    displayName: c.displayName,
    email: c.email,
    birthdayValue: c.birthdayValue,
    birthdayMonthDay: c.monthDay,
    daysUntil: c.daysUntil,
    daysUntilLabel: formatDaysUntil(c.daysUntil),
    isToday: c.daysUntil === 0,
  }));
}
