"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { signIn } from "next-auth/react";

const NativeAuth = registerPlugin<{ authenticate(options: { url: string }): Promise<{ ticket: string }> }>("LoccalAuth");
let signingIn = false;

export async function signInToLoccal() {
  if (!Capacitor.isNativePlatform()) return signIn("google");
  if (signingIn) return;
  signingIn = true;
  try {
    const start = await fetch("/api/mobile/start", { method: "POST" });
    if (!start.ok) throw new Error("Sign-in could not start. Please try again.");
    const { url } = await start.json();
    const { ticket } = await NativeAuth.authenticate({ url });
    const session = await fetch("/api/mobile/session", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket })
    });
    if (!session.ok) throw new Error("Sign-in expired. Please try again.");
    window.location.assign("/dashboard");
  } finally {
    signingIn = false;
  }
}
