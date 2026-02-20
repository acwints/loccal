import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import { buildFriendMonthResponse } from "@/lib/social-graph";

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
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = normalizeMonth(url.searchParams.get("month"));

  if (!month) {
    return NextResponse.json({ error: "Invalid month. Use YYYY-MM." }, { status: 400 });
  }

  try {
    const data = await buildFriendMonthResponse(user.id, month);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to load friend month: ${message}` }, { status: 500 });
  }
}
