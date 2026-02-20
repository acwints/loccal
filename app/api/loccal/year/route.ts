import { NextResponse } from "next/server";

import { fetchEventsFromAllCalendars } from "@/lib/google-calendar";
import { buildYearlyLocationRollup } from "@/lib/loccal";
import { requireSessionUser } from "@/lib/session-user";

export const runtime = "nodejs";

function normalizeYear(year?: string | null) {
  if (!year) {
    return String(new Date().getFullYear());
  }

  const validYear = year.match(/^\d{4}$/);
  if (!validYear) return null;
  return year;
}

export async function GET(request: Request) {
  const { session, user } = await requireSessionUser();

  if (!session || !user || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const url = new URL(request.url);
  const year = normalizeYear(url.searchParams.get("year"));

  if (!year) {
    return NextResponse.json({ error: "Invalid year. Use YYYY." }, { status: 400 });
  }

  const start = new Date(Number(year), 0, 1);
  const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);

  try {
    const { events, timeZone } = await fetchEventsFromAllCalendars(session.accessToken, start, end);
    const rollup = await buildYearlyLocationRollup(events, year, timeZone);
    const generatedAt = new Date().toISOString();

    return NextResponse.json({
      ...rollup,
      timeZone,
      generatedAt,
      generatedBy: "@Loccal"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to build yearly data: ${message}` }, { status: 500 });
  }
}
