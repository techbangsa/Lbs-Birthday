import "server-only";

import type { UpcomingBirthdayDto } from "@/lib/birthdays/contracts";
import { getDatePartsInTimeZone, parseBirthdayValue } from "@/lib/birthdays/matcher";
import { db } from "@/lib/db";

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
  timeZone,
  limit = 5,
}: {
  timeZone: string;
  limit?: number;
}): Promise<UpcomingBirthdayDto[]> {
  const today = getDatePartsInTimeZone(new Date(), timeZone);
  const customers = await db.birthdayCustomer.findMany();

  const candidates = customers.flatMap((customer) => {
    const parsed = parseBirthdayValue(customer.birthdayValue);
    if (!parsed) {
      return [];
    }

    return [
      {
        id: customer.customerId,
        displayName: customer.displayName,
        email: customer.email,
        birthdayValue: customer.birthdayValue,
        monthDay: parsed.monthDay,
        daysUntil: daysUntilBirthday(parsed.month, parsed.day, today.month, today.day, today.year),
      },
    ];
  });

  candidates.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.displayName.localeCompare(b.displayName);
  });

  return candidates.slice(0, limit).map((candidate) => ({
    id: candidate.id,
    displayName: candidate.displayName,
    email: candidate.email,
    birthdayValue: candidate.birthdayValue,
    birthdayMonthDay: candidate.monthDay,
    daysUntil: candidate.daysUntil,
    daysUntilLabel: formatDaysUntil(candidate.daysUntil),
    isToday: candidate.daysUntil === 0,
  }));
}
