import type { CalendarEventInput } from "@/lib/google-calendar";

const US_STATE_MAP: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
  "WASHINGTON DC": "DC",
  "WASHINGTON, DC": "DC"
};

const US_STATE_CODES = new Set(Object.values(US_STATE_MAP));

export interface DayLocation {
  location: string;
  details: string[];
}

export interface MonthlyRollup {
  month: string;
  days: Record<string, DayLocation[]>;
}

interface EventGroup {
  start: Date;
  details: string;
}

interface DayRange {
  startDay: number;
  endDayExclusive: number;
  details: string[];
}

function toMonthPrefix(monthKey: string) {
  return `${monthKey}-`;
}

function toDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function isUSState(token: string) {
  const normalized = token.trim().toUpperCase();
  return US_STATE_CODES.has(normalized) || US_STATE_MAP[normalized] != null;
}

function normalizeUSState(token: string) {
  const normalized = token.trim().toUpperCase();
  if (US_STATE_CODES.has(normalized)) return normalized;
  return US_STATE_MAP[normalized] ?? null;
}

function normalizeCountry(token?: string) {
  if (!token) return "";
  const normalized = token.trim().toUpperCase();
  if (["USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(normalized)) {
    return "USA";
  }
  if (["CANADA", "CA"].includes(normalized)) return "Canada";
  if (["UNITED KINGDOM", "UK", "GB", "GREAT BRITAIN"].includes(normalized)) {
    return "UK";
  }
  return token.trim();
}

function dateKeyToEpochDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function epochDayToDateKey(epochDay: number) {
  const date = new Date(epochDay * 86400000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function trimAddress(location: string) {
  const normalized = location.trim().replace(/\s+/g, " ");
  const commaMatch = normalized.match(/([^,]+,[^,]+)/);
  if (commaMatch) return commaMatch[1].trim();

  const stateMatch = normalized.match(/([A-Za-z .'\-]+)\s+([A-Z]{2})\b/);
  if (stateMatch) return `${stateMatch[1].trim()}, ${stateMatch[2]}`;

  return normalized;
}

function isValidPlace(location?: string | null) {
  if (!location) return false;
  const normalized = location.trim();
  if (/^https?:\/\//i.test(normalized)) return false;
  if (/\S+@\S+\.\S+/.test(normalized)) return false;
  return true;
}

function isAirport(location: string) {
  const hasAirportKeyword = /\b(airport|intl\.?|international|terminal|airfield)\b/i.test(location);
  const hasParenIata = /\(([A-Z]{3})\)/.test(location);
  const iataMatch = /\b([A-Z]{3})\b/.exec(location);
  const ignored = new Set(["USA", "UAE", "EUR"]);
  const hasIataWithAirportWord =
    Boolean(iataMatch) && !ignored.has(iataMatch![1]) && /\bairport\b/i.test(location);
  return hasAirportKeyword || hasParenIata || hasIataWithAirportWord;
}

function getCityStateCountryFromLocation(location: string) {
  const raw = location.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  const commaPattern = raw.match(/^\s*([^,]+)\s*,\s*([A-Z]{2,3})\s*(?:,\s*([A-Za-z\s.]+))?/);
  if (commaPattern) {
    const city = commaPattern[1].trim();
    const region = commaPattern[2].trim().toUpperCase();
    const countryNorm = normalizeCountry(commaPattern[3]) || (isUSState(region) ? "USA" : "");
    return countryNorm ? `${city}, ${region}, ${countryNorm}` : `${city}, ${region}`;
  }

  const tokens = raw.split(" ");
  const upper = tokens.map((token) => token.toUpperCase());
  let stateIdx = -1;
  let stateCode: string | null = null;

  for (let i = 0; i < upper.length; i += 1) {
    if (/^[A-Z]{2}$/.test(upper[i]) && isUSState(upper[i])) {
      stateIdx = i;
      stateCode = upper[i];
      break;
    }
  }

  if (stateIdx === -1) {
    for (let length = 3; length >= 1; length -= 1) {
      for (let i = 0; i + length <= upper.length; i += 1) {
        const joined = upper.slice(i, i + length).join(" ");
        const normalized = normalizeUSState(joined);
        if (normalized) {
          stateIdx = i + length - 1;
          stateCode = normalized;
          break;
        }
      }
      if (stateIdx !== -1) break;
    }
  }

  if (stateIdx !== -1 && stateCode) {
    const streetBoundaries = new Set([
      "ST",
      "ST.",
      "STREET",
      "AVE",
      "AVENUE",
      "RD",
      "RD.",
      "ROAD",
      "DR",
      "DR.",
      "DRIVE",
      "BLVD",
      "BLVD.",
      "LANE",
      "LN",
      "LN.",
      "WAY",
      "PL",
      "PL.",
      "CT",
      "CT."
    ]);

    let cityTokens: string[] = [];
    for (let i = stateIdx - 1; i >= 0; i -= 1) {
      const current = upper[i];
      if (/^\d{5}(-\d{4})?$/.test(current) || /^\d+$/.test(current)) {
        cityTokens = [];
        continue;
      }
      if (streetBoundaries.has(current)) {
        cityTokens = [];
        continue;
      }
      cityTokens.unshift(tokens[i]);
      if (cityTokens.length >= 3) break;
    }

    const city = cityTokens.join(" ").trim();
    if (!city) return null;

    const tail = tokens.slice(stateIdx + 1).join(" ").trim();
    const countryMatch = tail.match(
      /\b(United States(?: of America)?|USA|US|Canada|CA|United Kingdom|UK|GB)\b/i
    );
    const country = countryMatch ? normalizeCountry(countryMatch[0]) : "USA";
    return `${city}, ${stateCode}, ${country}`;
  }

  const cityCountryPattern = raw.match(
    /^\s*(?:\d+\s+\S+\s+)?([A-Za-z .'\-]+)\s+(USA|US|United States|United States of America|UK|United Kingdom|Canada|CA)\s*$/i
  );
  if (cityCountryPattern) {
    const city = cityCountryPattern[1].trim();
    const country = normalizeCountry(cityCountryPattern[2]);
    return `${city}, ${country}`;
  }

  return null;
}

function mergeRangesAndCombineDetails(ranges: DayRange[]) {
  if (ranges.length === 0) return [];

  ranges.sort((a, b) => a.startDay - b.startDay);

  const merged: DayRange[] = [];
  let current: DayRange = {
    startDay: ranges[0].startDay,
    endDayExclusive: ranges[0].endDayExclusive,
    details: [...ranges[0].details]
  };

  for (let i = 1; i < ranges.length; i += 1) {
    const next = ranges[i];
    if (current.endDayExclusive >= next.startDay) {
      current.endDayExclusive = Math.max(current.endDayExclusive, next.endDayExclusive);
      current.details.push(...next.details);
      continue;
    }

    merged.push(current);
    current = {
      startDay: next.startDay,
      endDayExclusive: next.endDayExclusive,
      details: [...next.details]
    };
  }

  merged.push(current);
  return merged;
}

function to12HourTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .replace(" ", "");
}

function addDayLocation(
  dayMap: Record<string, Record<string, string[]>>,
  dateKey: string,
  location: string,
  details: string[]
) {
  if (!dayMap[dateKey]) dayMap[dateKey] = {};
  if (!dayMap[dateKey][location]) dayMap[dateKey][location] = [];
  dayMap[dateKey][location].push(...details);
}

export function buildMonthlyLocationRollup(
  events: CalendarEventInput[],
  monthKey: string,
  timeZone: string
): MonthlyRollup {
  const locationMap: Record<string, Record<string, EventGroup[]>> = {};
  const multiDayAllDayByCity: Record<string, DayRange[]> = {};

  for (const event of events) {
    const sourceLocation = event.location || event.description;
    if (!sourceLocation || !isValidPlace(sourceLocation)) continue;

    const cityStateCountry = getCityStateCountryFromLocation(sourceLocation);
    if (!cityStateCountry || isAirport(sourceLocation)) continue;

    const trimmedAddress = cityStateCountry || trimAddress(sourceLocation);
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(sourceLocation)}`;

    const details = event.isAllDay
      ? `All-Day Event: ${event.title} @ ${trimmedAddress} (${mapsUrl})`
      : `${to12HourTime(event.start, timeZone)} - ${to12HourTime(event.end, timeZone)}: ${event.title} @ ${trimmedAddress} (${mapsUrl})`;

    if (event.isAllDay && event.end > event.start && event.allDayStartKey && event.allDayEndKeyExclusive) {
      if (!multiDayAllDayByCity[cityStateCountry]) {
        multiDayAllDayByCity[cityStateCountry] = [];
      }
      multiDayAllDayByCity[cityStateCountry].push({
        startDay: dateKeyToEpochDay(event.allDayStartKey),
        endDayExclusive: dateKeyToEpochDay(event.allDayEndKeyExclusive),
        details: [details]
      });
      continue;
    }

    const dateKey = toDateKey(event.start, timeZone);
    if (!locationMap[dateKey]) locationMap[dateKey] = {};
    if (!locationMap[dateKey][cityStateCountry]) locationMap[dateKey][cityStateCountry] = [];
    locationMap[dateKey][cityStateCountry].push({ start: event.start, details });
  }

  const monthPrefix = toMonthPrefix(monthKey);
  const days: Record<string, Record<string, string[]>> = {};

  for (const [dateKey, locationGroups] of Object.entries(locationMap)) {
    if (!dateKey.startsWith(monthPrefix)) continue;

    for (const [cityStateCountry, groupedEvents] of Object.entries(locationGroups)) {
      groupedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      addDayLocation(
        days,
        dateKey,
        cityStateCountry,
        groupedEvents.map((item) => item.details)
      );
    }
  }

  for (const [cityStateCountry, ranges] of Object.entries(multiDayAllDayByCity)) {
    const mergedRanges = mergeRangesAndCombineDetails(ranges);

    for (const range of mergedRanges) {
      for (let day = range.startDay; day < range.endDayExclusive; day += 1) {
        const dateKey = epochDayToDateKey(day);
        if (!dateKey.startsWith(monthPrefix)) continue;
        addDayLocation(days, dateKey, cityStateCountry, range.details);
      }
    }
  }

  const normalizedDays: Record<string, DayLocation[]> = {};

  for (const [dateKey, groupedLocations] of Object.entries(days)) {
    normalizedDays[dateKey] = Object.entries(groupedLocations)
      .map(([location, details]) => ({ location, details }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }

  return {
    month: monthKey,
    days: normalizedDays
  };
}
