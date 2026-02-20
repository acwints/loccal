import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import { listFriends } from "@/lib/social-graph";

export const runtime = "nodejs";

export async function GET() {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const friends = await listFriends(user.id);
    return NextResponse.json(friends);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to load friends: ${message}` }, { status: 500 });
  }
}
