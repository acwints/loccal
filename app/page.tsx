import { getServerSession } from "next-auth";

import { LoccalDashboard } from "@/components/loccal-dashboard";
import { LoginCard } from "@/components/login-card";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="signin-shell">
        <LoginCard />
      </main>
    );
  }

  return <LoccalDashboard userName={session.user?.name} />;
}
