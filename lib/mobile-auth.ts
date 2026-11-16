import { createHash, timingSafeEqual } from "node:crypto";
import { decode, encode, type JWT } from "next-auth/jwt";

export function nativeSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for iPhone sign-in.");
  return secret;
}

export function nativeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("hex");
}

export function validChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export async function createNativeTicket(userToken: JWT, challenge: string) {
  return encode({ secret: `${nativeSecret()}:loccal-native`, maxAge: 60, token: { userToken, challenge } });
}

export async function redeemNativeTicket(ticket: string, verifier: string): Promise<JWT | null> {
  try {
    const payload = await decode({ secret: `${nativeSecret()}:loccal-native`, token: ticket });
    if (!payload || !validChallenge(payload.challenge) || !validChallenge(verifier)) return null;
    const expected = nativeChallenge(verifier);
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(payload.challenge))) return null;
    const token = payload.userToken as JWT | undefined;
    if (!token?.sub || typeof token.accessToken !== "string") return null;
    return token;
  } catch {
    return null;
  }
}

export function nativeCookie(secure: boolean) {
  return secure ? "__Host-loccal-native" : "loccal-native";
}
