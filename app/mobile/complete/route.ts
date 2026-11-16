import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { createNativeTicket, nativeSecret, validChallenge } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  if (!validChallenge(challenge)) return new NextResponse("Invalid sign-in request", { status: 400 });
  const token = await getToken({ req: request, secret: nativeSecret() });
  if (!token?.sub || !token.accessToken) return new NextResponse("Sign-in expired. Return to Loccal and try again.", { status: 401 });
  const ticket = await createNativeTicket(token, challenge);
  return new NextResponse(null, {
    status: 302,
    headers: { Location: `loccal://auth?ticket=${encodeURIComponent(ticket)}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }
  });
}
