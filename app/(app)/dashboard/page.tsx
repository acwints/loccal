import { getServerSession } from "next-auth";

import { LoccalDashboard } from "@/components/loccal-dashboard";
import { getAuthOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(getAuthOptions());
  return <LoccalDashboard userName={session?.user?.name} />;
}
