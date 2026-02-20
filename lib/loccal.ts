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
const COUNTRY_NAME_MAP = buildCountryNameMap();

export interface DayLocation {
  location: string;
  events: InferredEvent[];
}

export interface InferredEvent {
  title: string;
  isAllDay: boolean;
  startIso: string;
  endIso: string;
  inferredFrom: string;
  mapsUrl: string;
}

export interface MonthlyRollup {
  month: string;
  days: Record<string, DayLocation[]>;
}

export interface YearlyRollup {
  year: string;
  days: Record<string, DayLocation[]>;
}

interface GeocodeOptions {
  disableGeocoding: boolean;
  googleApiKey?: string;
  enableNominatim: boolean;
  userAgent: string;
}

interface GoogleGeocodeComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  address_components: GoogleGeocodeComponent[];
}

interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
}

export interface NominatimGeocodeResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    state?: string;
    province?: string;
    country?: string;
    country_code?: string;
  };
}

interface EventGroup {
  start: Date;
  event: InferredEvent;
}

interface DayRange {
  startDay: number;
  endDayExclusive: number;
  events: InferredEvent[];
}

const NON_LOCATION_WORDS = new Set([
  "will",
  "writing",
  "exercise",
  "negotiation",
  "helpful",
  "launches",
  "instructions",
  "available",
  "pages",
  "assignments",
  "assignment",
  "module",
  "lecture",
  "class",
  "google",
  "meet",
  "async",
  "week",
  "read",
  "reading",
  "watch",
  "submit",
  "upload",
  "settings",
  "holiday",
  "holidays"
]);

const DISALLOWED_CITY_WORDS = new Set([
  ...NON_LOCATION_WORDS,
  "all",
  "for",
  "every",
  "part",
  "double",
  "spaced",
  "from",
  "about",
  "into",
  "through",
  "across",
  "inside",
  "outside"
]);

const GEO_CITY_COMPONENT_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_3",
  "sublocality",
  "neighborhood"
];

function buildCountryNameMap() {
  const countries = new Map<string, string>();

  countries.set("USA", "USA");
  countries.set("US", "USA");
  countries.set("UNITED STATES", "USA");
  countries.set("UNITED STATES OF AMERICA", "USA");
  countries.set("CANADA", "Canada");
  countries.set("CA", "Canada");
  countries.set("UNITED KINGDOM", "UK");
  countries.set("UK", "UK");
  countries.set("GB", "UK");
  countries.set("GREAT BRITAIN", "UK");

  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    const intlWithSupportedValues = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    const regionCodes = intlWithSupportedValues.supportedValuesOf?.("region") ?? [];

    for (const code of regionCodes) {
      const name = display.of(code);
      if (!name) continue;
      const normalizedName = name.trim();
      if (!normalizedName) continue;
      countries.set(normalizedName.toUpperCase(), normalizedName);
    }
  } catch {
    // Keep alias-only fallbacks if region display APIs are unavailable.
  }

  return countries;
}

function readEnvFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function getGeocodeOptions(): GeocodeOptions {
  return {
    disableGeocoding: readEnvFlag("LOCCAL_DISABLE_GEOCODING", false),
    googleApiKey: process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim() || undefined,
    enableNominatim: readEnvFlag("LOCCAL_ENABLE_NOMINATIM_FALLBACK", true),
    userAgent: process.env.LOCCAL_GEOCODER_USER_AGENT?.trim() || "Loccal/1.0"
  };
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

export function normalizeUSState(token: string) {
  const normalized = token.trim().toUpperCase();
  if (US_STATE_CODES.has(normalized)) return normalized;
  return US_STATE_MAP[normalized] ?? null;
}

export function normalizeCountry(token?: string) {
  if (!token) return null;
  const normalized = token.trim().replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
  if (!normalized) return null;
  return COUNTRY_NAME_MAP.get(normalized) ?? null;
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

function isValidPlace(location?: string | null) {
  if (!location) return false;
  const normalized = location.trim();
  if (normalized.length < 3) return false;
  if (normalized.length > 140) return false;
  if (/[<>]/.test(normalized)) return false;
  if (/[\n\r\t]/.test(normalized)) return false;
  if (/[:;!?]/.test(normalized)) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  if (/\bhttps?:\/\//i.test(normalized) || /\bwww\./i.test(normalized)) return false;
  if (/\S+@\S+\.\S+/.test(normalized)) return false;
  if ((normalized.match(/,/g) ?? []).length > 5) return false;
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

function hasNonLocationWords(segment: string) {
  const words = segment
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.some((word) => NON_LOCATION_WORDS.has(word));
}

export function isLikelyCitySegment(segment: string) {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  if (/\d{2,}/.test(trimmed)) return false;
  if (!/[a-z]/i.test(trimmed)) return false;
  if (hasNonLocationWords(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;
  if (words.length === 1 && words[0].length < 3) return false;
  if (words.some((word) => DISALLOWED_CITY_WORDS.has(word.toLowerCase()))) return false;
  if (words.some((word) => word.length > 20)) return false;
  return true;
}

function getCityStateCountryFromLocation(location: string) {
  const raw = location.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const firstPartLooksLikeAddress = /\d/.test(parts[0]);
    const cityCandidate = firstPartLooksLikeAddress && parts.length >= 3 ? parts[1] : parts[0];
    const regionPart = firstPartLooksLikeAddress && parts.length >= 3 ? parts[2] : parts[1];
    const countryPart = firstPartLooksLikeAddress && parts.length >= 4 ? parts[3] : parts[2];

    if (isLikelyCitySegment(cityCandidate)) {
      const regionToken = regionPart?.replace(/\d{5}(?:-\d{4})?/g, "").trim();
      const stateCode = regionToken ? normalizeUSState(regionToken) : null;

      if (stateCode) {
        const country = normalizeCountry(countryPart) ?? "USA";
        return `${cityCandidate}, ${stateCode}, ${country}`;
      }

      const country = normalizeCountry(regionToken) ?? normalizeCountry(countryPart);
      if (country) {
        return `${cityCandidate}, ${country}`;
      }
    }
  }

  const cityStateCodePattern = raw.match(/^([A-Za-z .'\-]{2,40})\s+([A-Z]{2})$/);
  if (cityStateCodePattern && isLikelyCitySegment(cityStateCodePattern[1])) {
    const stateCode = normalizeUSState(cityStateCodePattern[2]);
    if (stateCode) return `${cityStateCodePattern[1].trim()}, ${stateCode}, USA`;
  }

  const cityCountryPattern = raw.match(
    /^([A-Za-z .'\-]{2,40})\s+(USA|US|United States|United States of America|UK|United Kingdom|Canada|CA)$/i
  );
  if (cityCountryPattern && isLikelyCitySegment(cityCountryPattern[1])) {
    const city = cityCountryPattern[1].trim();
    const country = normalizeCountry(cityCountryPattern[2]);
    if (!country) return null;
    return `${city}, ${country}`;
  }

  return null;
}

export function formatResolvedLocation(
  cityToken: string | undefined,
  regionToken: string | undefined,
  countryToken: string | undefined
) {
  const city = cityToken?.trim().replace(/\s+/g, " ");
  if (!city || !isLikelyCitySegment(city)) return null;

  const country =
    normalizeCountry(countryToken) ??
    normalizeCountry(countryToken?.toUpperCase()) ??
    normalizeCountry(countryToken?.toLowerCase());

  if (!country) return null;

  if (country === "USA") {
    const stateCode = regionToken ? normalizeUSState(regionToken) : null;
    if (!stateCode) return null;
    return `${city}, ${stateCode}, USA`;
  }

  if (country === "Canada") {
    const province = regionToken?.trim();
    if (province && province.length <= 24) {
      return `${city}, ${province}, Canada`;
    }
    return `${city}, Canada`;
  }

  return `${city}, ${country}`;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldTryGeocoding(location: string) {
  const normalized = location.trim();
  if (!isValidPlace(normalized)) return false;
  if (hasNonLocationWords(normalized)) return false;
  if (normalized.split(/\s+/).length > 10) return false;
  if ((normalized.match(/,/g) ?? []).length > 4) return false;
  return true;
}

async function geocodeWithGoogle(
  sourceLocation: string,
  options: GeocodeOptions
): Promise<string | null> {
  if (!options.googleApiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", sourceLocation);
  url.searchParams.set("key", options.googleApiKey);

  const payload = await fetchJsonWithTimeout<GoogleGeocodeResponse>(
    url.toString(),
    {
      headers: {
        "Accept-Language": "en"
      }
    },
    2500
  );

  if (!payload || payload.status !== "OK") return null;

  for (const result of payload.results ?? []) {
    const cityComponent = GEO_CITY_COMPONENT_TYPES.map((type) =>
      result.address_components.find((component) => component.types.includes(type))
    ).find(Boolean);
    const regionComponent = result.address_components.find((component) =>
      component.types.includes("administrative_area_level_1")
    );
    const countryComponent = result.address_components.find((component) =>
      component.types.includes("country")
    );

    const resolved = formatResolvedLocation(
      cityComponent?.long_name,
      regionComponent?.short_name ?? regionComponent?.long_name,
      countryComponent?.short_name ?? countryComponent?.long_name
    );
    if (resolved) return resolved;
  }

  return null;
}

async function geocodeWithNominatim(
  sourceLocation: string,
  options: GeocodeOptions
): Promise<string | null> {
  if (!options.enableNominatim) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", sourceLocation);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "3");

  const payload = await fetchJsonWithTimeout<NominatimGeocodeResult[]>(
    url.toString(),
    {
      headers: {
        "User-Agent": options.userAgent,
        "Accept-Language": "en"
      }
    },
    2800
  );

  if (!payload) return null;

  for (const candidate of payload) {
    const address = candidate.address;
    if (!address) continue;

    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.hamlet;

    const countryToken = address.country ?? address.country_code?.toUpperCase();
    const regionToken = address.state ?? address.province;

    const resolved = formatResolvedLocation(city, regionToken, countryToken);
    if (resolved) return resolved;
  }

  return null;
}

async function resolveValidatedLocation(
  sourceLocation: string,
  options: GeocodeOptions
): Promise<string | null> {
  const parserCandidate = getCityStateCountryFromLocation(sourceLocation);

  if (options.disableGeocoding || !shouldTryGeocoding(sourceLocation)) {
    return parserCandidate;
  }

  const geocoded =
    (await geocodeWithGoogle(sourceLocation, options)) ??
    (await geocodeWithNominatim(sourceLocation, options));

  return geocoded ?? parserCandidate;
}

async function buildLocationResolutionMap(candidates: string[]) {
  const options = getGeocodeOptions();
  const deduped = Array.from(new Set(candidates));
  const resolved = new Map<string, string | null>();

  // Keep external geocoding pressure low while still parallelizing enough for UX.
  const maxWorkers = options.googleApiKey ? 3 : 2;
  const queue = [...deduped];

  async function worker() {
    while (queue.length > 0) {
      const sourceLocation = queue.shift();
      if (!sourceLocation) return;

      if (!isValidPlace(sourceLocation) || isAirport(sourceLocation)) {
        resolved.set(sourceLocation, null);
        continue;
      }

      const city = await resolveValidatedLocation(sourceLocation, options);
      resolved.set(sourceLocation, city);
    }
  }

  const workers = Array.from({ length: Math.min(maxWorkers, queue.length) }, () => worker());
  await Promise.all(workers);
  return resolved;
}

function mergeRangesAndCombineDetails(ranges: DayRange[]) {
  if (ranges.length === 0) return [];

  ranges.sort((a, b) => a.startDay - b.startDay);

  const merged: DayRange[] = [];
  let current: DayRange = {
    startDay: ranges[0].startDay,
    endDayExclusive: ranges[0].endDayExclusive,
    events: [...ranges[0].events]
  };

  for (let i = 1; i < ranges.length; i += 1) {
    const next = ranges[i];
    if (current.endDayExclusive >= next.startDay) {
      current.endDayExclusive = Math.max(current.endDayExclusive, next.endDayExclusive);
      current.events.push(...next.events);
      continue;
    }

    merged.push(current);
    current = {
      startDay: next.startDay,
      endDayExclusive: next.endDayExclusive,
      events: [...next.events]
    };
  }

  merged.push(current);
  return merged;
}

function addDayLocation(
  dayMap: Record<string, Record<string, InferredEvent[]>>,
  dateKey: string,
  location: string,
  events: InferredEvent[]
) {
  if (!dayMap[dateKey]) dayMap[dateKey] = {};
  if (!dayMap[dateKey][location]) dayMap[dateKey][location] = [];
  dayMap[dateKey][location].push(...events);
}

export async function buildMonthlyLocationRollup(
  events: CalendarEventInput[],
  monthKey: string,
  timeZone: string
): Promise<MonthlyRollup> {
  const locationMap: Record<string, Record<string, EventGroup[]>> = {};
  const multiDayAllDayByCity: Record<string, DayRange[]> = {};
  const sourceLocations = Array.from(
    new Set(
      events
        .map((event) => event.location?.trim().replace(/\s+/g, " "))
        .filter((location): location is string => Boolean(location))
    )
  );
  const locationResolutionMap = await buildLocationResolutionMap(sourceLocations);

  for (const event of events) {
    const sourceLocation = event.location?.trim().replace(/\s+/g, " ");
    if (!sourceLocation) continue;

    const cityStateCountry = locationResolutionMap.get(sourceLocation) ?? null;
    if (!cityStateCountry) continue;

    const inferredEvent: InferredEvent = {
      title: event.title,
      isAllDay: event.isAllDay,
      startIso: event.start.toISOString(),
      endIso: event.end.toISOString(),
      inferredFrom: sourceLocation,
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(sourceLocation)}`
    };

    if (event.isAllDay && event.end > event.start && event.allDayStartKey && event.allDayEndKeyExclusive) {
      if (!multiDayAllDayByCity[cityStateCountry]) {
        multiDayAllDayByCity[cityStateCountry] = [];
      }
      multiDayAllDayByCity[cityStateCountry].push({
        startDay: dateKeyToEpochDay(event.allDayStartKey),
        endDayExclusive: dateKeyToEpochDay(event.allDayEndKeyExclusive),
        events: [inferredEvent]
      });
      continue;
    }

    const dateKey = toDateKey(event.start, timeZone);
    if (!locationMap[dateKey]) locationMap[dateKey] = {};
    if (!locationMap[dateKey][cityStateCountry]) locationMap[dateKey][cityStateCountry] = [];
    locationMap[dateKey][cityStateCountry].push({ start: event.start, event: inferredEvent });
  }

  const monthPrefix = toMonthPrefix(monthKey);
  const days: Record<string, Record<string, InferredEvent[]>> = {};

  for (const [dateKey, locationGroups] of Object.entries(locationMap)) {
    if (!dateKey.startsWith(monthPrefix)) continue;

    for (const [cityStateCountry, groupedEvents] of Object.entries(locationGroups)) {
      groupedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      addDayLocation(
        days,
        dateKey,
        cityStateCountry,
        groupedEvents.map((item) => item.event)
      );
    }
  }

  for (const [cityStateCountry, ranges] of Object.entries(multiDayAllDayByCity)) {
    const mergedRanges = mergeRangesAndCombineDetails(ranges);

    for (const range of mergedRanges) {
      for (let day = range.startDay; day < range.endDayExclusive; day += 1) {
        const dateKey = epochDayToDateKey(day);
        if (!dateKey.startsWith(monthPrefix)) continue;
        addDayLocation(days, dateKey, cityStateCountry, range.events);
      }
    }
  }

  const normalizedDays: Record<string, DayLocation[]> = {};

  for (const [dateKey, groupedLocations] of Object.entries(days)) {
    normalizedDays[dateKey] = Object.entries(groupedLocations)
      .map(([location, cityEvents]) => ({
        location,
        events: Array.from(
          new Map(
            cityEvents.map((event) => [
              `${event.title}|${event.startIso}|${event.endIso}|${event.inferredFrom}`,
              event
            ])
          ).values()
        ).sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime())
      }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }

  return {
    month: monthKey,
    days: normalizedDays
  };
}

export async function buildYearlyLocationRollup(
  events: CalendarEventInput[],
  year: string,
  timeZone: string
): Promise<YearlyRollup> {
  const locationMap: Record<string, Record<string, EventGroup[]>> = {};
  const multiDayAllDayByCity: Record<string, DayRange[]> = {};
  const sourceLocations = Array.from(
    new Set(
      events
        .map((event) => event.location?.trim().replace(/\s+/g, " "))
        .filter((location): location is string => Boolean(location))
    )
  );
  const locationResolutionMap = await buildLocationResolutionMap(sourceLocations);

  for (const event of events) {
    const sourceLocation = event.location?.trim().replace(/\s+/g, " ");
    if (!sourceLocation) continue;

    const cityStateCountry = locationResolutionMap.get(sourceLocation) ?? null;
    if (!cityStateCountry) continue;

    const inferredEvent: InferredEvent = {
      title: event.title,
      isAllDay: event.isAllDay,
      startIso: event.start.toISOString(),
      endIso: event.end.toISOString(),
      inferredFrom: sourceLocation,
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(sourceLocation)}`
    };

    if (event.isAllDay && event.end > event.start && event.allDayStartKey && event.allDayEndKeyExclusive) {
      if (!multiDayAllDayByCity[cityStateCountry]) {
        multiDayAllDayByCity[cityStateCountry] = [];
      }
      multiDayAllDayByCity[cityStateCountry].push({
        startDay: dateKeyToEpochDay(event.allDayStartKey),
        endDayExclusive: dateKeyToEpochDay(event.allDayEndKeyExclusive),
        events: [inferredEvent]
      });
      continue;
    }

    const dateKey = toDateKey(event.start, timeZone);
    if (!locationMap[dateKey]) locationMap[dateKey] = {};
    if (!locationMap[dateKey][cityStateCountry]) locationMap[dateKey][cityStateCountry] = [];
    locationMap[dateKey][cityStateCountry].push({ start: event.start, event: inferredEvent });
  }

  const yearPrefix = `${year}-`;
  const days: Record<string, Record<string, InferredEvent[]>> = {};

  for (const [dateKey, locationGroups] of Object.entries(locationMap)) {
    if (!dateKey.startsWith(yearPrefix)) continue;

    for (const [cityStateCountry, groupedEvents] of Object.entries(locationGroups)) {
      groupedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      addDayLocation(
        days,
        dateKey,
        cityStateCountry,
        groupedEvents.map((item) => item.event)
      );
    }
  }

  for (const [cityStateCountry, ranges] of Object.entries(multiDayAllDayByCity)) {
    const mergedRanges = mergeRangesAndCombineDetails(ranges);

    for (const range of mergedRanges) {
      for (let day = range.startDay; day < range.endDayExclusive; day += 1) {
        const dateKey = epochDayToDateKey(day);
        if (!dateKey.startsWith(yearPrefix)) continue;
        addDayLocation(days, dateKey, cityStateCountry, range.events);
      }
    }
  }

  const normalizedDays: Record<string, DayLocation[]> = {};

  for (const [dateKey, groupedLocations] of Object.entries(days)) {
    normalizedDays[dateKey] = Object.entries(groupedLocations)
      .map(([location, cityEvents]) => ({
        location,
        events: Array.from(
          new Map(
            cityEvents.map((event) => [
              `${event.title}|${event.startIso}|${event.endIso}|${event.inferredFrom}`,
              event
            ])
          ).values()
        ).sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime())
      }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }

  return {
    year,
    days: normalizedDays
  };
}
