import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/lib/auth";
import { upsertSocialUser } from "@/lib/social-store";

function fallbackEmailForUser(userId: string) {
  return `${userId}@loccal.local`;
}

export async function requireSessionUser() {
  const session = await getServerSession(getAuthOptions());
  const userId = session?.user?.id;

  if (!session || !userId) {
    return { session: null, user: null };
  }

  const email = session.user?.email?.trim() || fallbackEmailForUser(userId);
  const name = session.user?.name?.trim() || email;

  const user = await upsertSocialUser({
    id: userId,
    email,
    name,
    avatarUrl: session.user?.image ?? null
  });

  return { session, user };
}
