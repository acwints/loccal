import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { UniversalHeader } from "@/components/universal-header";
import { getAuthOptions } from "@/lib/auth";

export default async function AuthedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(getAuthOptions());

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <UniversalHeader user={session.user} />
      {children}
    </>
  );
}
