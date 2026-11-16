import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { nativeCookie, nativeSecret, redeemNativeTicket } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  const origin = new URL(process.env.NEXTAUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const secure = origin.startsWith("https:");
  const verifier = request.cookies.get(nativeCookie(secure))?.value;
  let ticket: unknown;
  try { ticket = (await request.json()).ticket; } catch { /* Invalid input is rejected below. */ }
  if (!verifier || typeof ticket !== "string" || ticket.length > 24000) {
    return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 401 });
  }
  const token = await redeemNativeTicket(ticket, verifier);
  if (!token) return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 401 });

  const maxAge = 30 * 24 * 60 * 60;
  const session = await encode({ secret: nativeSecret(), token, maxAge });
  const cookieName = `${secure ? "__Secure-" : ""}next-auth.session-token`;
  const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  // Match NextAuth's chunking so large Google tokens still fit in cookies.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`)) {
      response.cookies.set(cookie.name, "", { ...options, maxAge: 0 });
    }
  }
  if (session.length <= 3800) response.cookies.set(cookieName, session, { ...options, maxAge });
  else for (let i = 0; i * 3800 < session.length; i++) {
    response.cookies.set(`${cookieName}.${i}`, session.slice(i * 3800, (i + 1) * 3800), { ...options, maxAge });
  }
  response.cookies.set(nativeCookie(secure), "", { ...options, maxAge: 0 });
  return response;
}
