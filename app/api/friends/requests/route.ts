import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import { listIncomingFriendRequests } from "@/lib/social-graph";

export const runtime = "nodejs";

export async function GET() {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const requests = await listIncomingFriendRequests(user.id);
    return NextResponse.json(requests);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to load requests: ${message}` }, { status: 500 });
  }
}
