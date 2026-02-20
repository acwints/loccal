import { getServerSession } from "next-auth";

import { FriendsScreen } from "@/components/friends-screen";
import { getAuthOptions } from "@/lib/auth";

export default async function FriendsPage() {
  const session = await getServerSession(getAuthOptions());
  return <FriendsScreen userName={session?.user?.name} />;
}
