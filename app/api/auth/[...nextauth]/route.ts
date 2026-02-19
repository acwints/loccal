import NextAuth from "next-auth";

import { getAuthOptions } from "@/lib/auth";

function createHandler() {
  return NextAuth(getAuthOptions());
}

type AuthHandler = ReturnType<typeof createHandler>;
type AuthHandlerArgs = Parameters<AuthHandler>;

export async function GET(...args: AuthHandlerArgs) {
  return createHandler()(...args);
}

export async function POST(...args: AuthHandlerArgs) {
  return createHandler()(...args);
}
