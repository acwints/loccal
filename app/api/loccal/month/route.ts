import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { fetchEventsFromAllCalendars } from "@/lib/google-calendar";
import { buildMonthlyLocationRollup } from "@/lib/loccal";

export const runtime = "nodejs";

function normalizeMonth(month?: string | null) {
  if (!month) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const validMonth = month.match(/^\d{4}-\d{2}$/);
  if (!validMonth) return null;
  return month;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = normalizeMonth(url.searchParams.get("month"));

  if (!month) {
    return NextResponse.json({ error: "Invalid month. Use YYYY-MM." }, { status: 400 });
  }

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setDate(start.getDate() - 30);
  end.setDate(end.getDate() + 365);

  try {
    const { events, timeZone } = await fetchEventsFromAllCalendars(session.accessToken, start, end);
    const rollup = buildMonthlyLocationRollup(events, month, timeZone);

    return NextResponse.json({
      ...rollup,
      timeZone,
      generatedAt: new Date().toISOString(),
      generatedBy: "@Loccal"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to build monthly data: ${message}` }, { status: 500 });
  }
}
