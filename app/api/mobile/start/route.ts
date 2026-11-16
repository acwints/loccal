import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { nativeChallenge, nativeCookie, nativeSecret } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  const origin = new URL(process.env.NEXTAUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  nativeSecret();
  const verifier = randomBytes(32).toString("hex");
  const secure = origin.startsWith("https:");
  const response = NextResponse.json({ url: `${origin}/mobile/sign-in?challenge=${nativeChallenge(verifier)}` });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(nativeCookie(secure), verifier, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
