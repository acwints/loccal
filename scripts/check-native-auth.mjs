import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  });
  new Function("require", "module", "exports", outputText)((name) =>
    name.startsWith("@/") ? load(path.join(root, `${name.slice(2)}.ts`)) : require(name), module, module.exports);
  modules.set(filename, module.exports);
  return module.exports;
}

process.env.NEXTAUTH_SECRET = "native-auth-test-only";
process.env.NEXTAUTH_URL = "https://loccal.test";
const { NextRequest } = require("next/server");
const { encode, getToken } = require("next-auth/jwt");
const auth = load(path.join(root, "lib/mobile-auth.ts"));
const start = load(path.join(root, "app/api/mobile/start/route.ts")).POST;
const redeem = load(path.join(root, "app/api/mobile/session/route.ts")).POST;
const req = (route, options = {}) => new NextRequest(`https://loccal.test${route}`, { method: "POST", headers: { origin: "https://loccal.test" }, ...options });

assert.equal((await start(req("/api/mobile/start", { headers: { origin: "https://attacker.test" } }))).status, 403);
const started = await start(req("/api/mobile/start"));
const verifier = started.cookies.get("__Host-loccal-native").value;
assert.equal(started.cookies.get("__Host-loccal-native").httpOnly, true);
const challenge = new URL((await started.json()).url).searchParams.get("challenge");
assert.equal(auth.nativeChallenge(verifier), challenge);
const userToken = { sub: "user-test", accessToken: "test-calendar-token", refreshToken: "test-refresh-token" };
const ticket = await auth.createNativeTicket(userToken, challenge);
assert.equal(ticket.includes("test-calendar-token"), false);
assert.deepEqual(await auth.redeemNativeTicket(ticket, verifier), userToken);
assert.equal(await auth.redeemNativeTicket(ticket, "a".repeat(64)), null);
assert.equal(await auth.redeemNativeTicket(`${ticket}tampered`, verifier), null);
const expired = await encode({ secret: `${process.env.NEXTAUTH_SECRET}:loccal-native`, maxAge: -60, token: { userToken, challenge } });
assert.equal(await auth.redeemNativeTicket(expired, verifier), null);
const ordinarySession = await encode({ secret: process.env.NEXTAUTH_SECRET, token: userToken });
assert.equal(await auth.redeemNativeTicket(ordinarySession, verifier), null);

const response = await redeem(req("/api/mobile/session", {
  headers: { origin: "https://loccal.test", cookie: `__Host-loccal-native=${verifier}` }, body: JSON.stringify({ ticket })
}));
assert.equal(response.status, 200);
assert.equal(response.cookies.get("__Host-loccal-native").maxAge, 0);
const sessionCookie = response.cookies.get("__Secure-next-auth.session-token");
assert.equal(sessionCookie.httpOnly, true);
const user = await getToken({ req: req("/dashboard", { headers: { cookie: `${sessionCookie.name}=${sessionCookie.value}` } }), secret: process.env.NEXTAUTH_SECRET });
assert.equal(user.sub, userToken.sub);
assert.equal(user.refreshToken, userToken.refreshToken);
assert.equal((await redeem(req("/api/mobile/session", { body: JSON.stringify({ ticket }) }))).status, 401);
assert.equal((await redeem(req("/api/mobile/session", { body: "invalid json" }))).status, 401);
console.log("Native sign-in checks passed: origin, device binding, expiry, tampering, and NextAuth session handoff.");
