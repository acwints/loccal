import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import { requestConnection } from "@/lib/social-graph";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { targetId?: string } | null;
    const result = await requestConnection(user.id, body?.targetId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to send request: ${message}` }, { status: 500 });
  }
}
