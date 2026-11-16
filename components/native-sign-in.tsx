"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function NativeSignIn({ challenge }: { challenge: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <>
    <p>Connect Google Calendar to see your locations and friend overlaps on iPhone.</p>
    <button className="primary-btn" disabled={busy} onClick={async () => {
      setBusy(true);
      setError("");
      try { await signIn("google", { callbackUrl: `/mobile/complete?challenge=${challenge}` }); }
      catch { setBusy(false); setError("Sign-in could not start. Please try again."); }
    }}>{busy ? "Connecting…" : "Continue with Google"}</button>
    {error && <p role="alert">{error}</p>}
  </>;
}
