export type ParsedBirthday = {
  raw: string;
  year: number;
  month: number;
  day: number;
  monthDay: string;
};

type CompareMode = "MONTH_DAY" | "EXACT_DATE";

const birthdayPatternYMD = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
const birthdayPatternDMY = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;

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

  // Try YYYY-MM-DD first (ISO format)
  let match = birthdayPatternYMD.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        raw: trimmed,
        year,
        month,
        day,
        monthDay: `${pad(month)}-${pad(day)}`,
      };
    }
  }

  // Try DD-MM-YYYY or MM-DD-YYYY
  match = birthdayPatternDMY.exec(trimmed);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);

    let day: number;
    let month: number;

    if (first > 12) {
      // first must be day (e.g. 25-07-2004)
      day = first;
      month = second;
    } else if (second > 12) {
      // second must be day (e.g. 07-25-2004)
      month = first;
      day = second;
    } else {
      // Ambiguous — default to DD-MM-YYYY (this store's convention)
      day = first;
      month = second;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        raw: trimmed,
        year,
        month,
        day,
        monthDay: `${pad(month)}-${pad(day)}`,
      };
    }
  }

  return null;
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