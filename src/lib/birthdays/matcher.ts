export type ParsedBirthday = {
  raw: string;
  year: number;
  month: number;
  day: number;
  monthDay: string;
};

type CompareMode = "MONTH_DAY" | "EXACT_DATE";

const birthdayPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return {
    year,
    month,
    day,
    monthDay: `${pad(month)}-${pad(day)}`,
  };
}

export function getCampaignYear(date: Date, timeZone: string) {
  return getDatePartsInTimeZone(date, timeZone).year;
}

export function parseBirthdayValue(value: string): ParsedBirthday | null {
  const trimmed = value.trim();
  const match = birthdayPattern.exec(trimmed);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return {
    raw: trimmed,
    year,
    month,
    day,
    monthDay: `${pad(month)}-${pad(day)}`,
  };
}

export function birthdayMatchesToday({
  birthdayValue,
  compareMode,
  timeZone,
  now,
}: {
  birthdayValue: string;
  compareMode: CompareMode;
  timeZone: string;
  now: Date;
}) {
  const parsed = parseBirthdayValue(birthdayValue);

  if (!parsed) {
    return false;
  }

  const today = getDatePartsInTimeZone(now, timeZone);
  const monthDayMatches = parsed.month === today.month && parsed.day === today.day;

  if (!monthDayMatches) {
    return false;
  }

  if (compareMode === "EXACT_DATE") {
    return parsed.year === today.year;
  }

  return true;
}