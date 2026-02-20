import { NextResponse } from "next/server";

import {
  NominatimGeocodeResult,
  formatResolvedLocation
} from "@/lib/loccal";

let lastRequestTime = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const now = Date.now();
  if (now - lastRequestTime < 1000) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }
  lastRequestTime = now;

  const userAgent =
    process.env.LOCCAL_GEOCODER_USER_AGENT?.trim() || "Loccal/1.0";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("featuretype", "city");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const payload = (await response.json()) as NominatimGeocodeResult[];

    const results: { display: string; city: string; region: string; country: string }[] = [];

    for (const candidate of payload) {
      const address = candidate.address;
      if (!address) continue;

      const city =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.hamlet;

      const regionToken = address.state ?? address.province;
      const countryToken = address.country ?? address.country_code?.toUpperCase();

      const display = formatResolvedLocation(city, regionToken, countryToken);
      if (!display) continue;

      if (results.some((r) => r.display === display)) continue;

      results.push({
        display,
        city: city ?? "",
        region: regionToken ?? "",
        country: countryToken ?? ""
      });
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
