import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import { searchUsers } from "@/lib/social-graph";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const result = await searchUsers(user.id, query);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to search users: ${message}` }, { status: 500 });
  }
}
