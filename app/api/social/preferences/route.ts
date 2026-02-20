import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/session-user";
import {
  getSocialUserPreferences,
  updateSocialUserPreferences,
  type SocialShareMode
} from "@/lib/social-store";

export const runtime = "nodejs";

const ALLOWED_MODES: SocialShareMode[] = ["friends", "private"];

export async function GET() {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const prefs = await getSocialUserPreferences(user.id);
    if (!prefs) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load sharing preferences: ${message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { user } = await requireSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { shareMode?: string } | null;
  const shareMode = body?.shareMode as SocialShareMode | undefined;

  if (!shareMode || !ALLOWED_MODES.includes(shareMode)) {
    return NextResponse.json(
      { error: "shareMode is required and must be one of: friends, private" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateSocialUserPreferences({ userId: user.id, shareMode });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update sharing preferences: ${message}` },
      { status: 500 }
    );
  }
}
