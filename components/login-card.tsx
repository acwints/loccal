"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await signIn("google"); }
    catch { setError("Sign-in could not start. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return (
    <section className="login-card">
      <p className="eyebrow">Loccal</p>
      <h1>See where you will be, day by day.</h1>
      <p>
        Sign in with Gmail, and this app reads your Google Calendars to infer a daily city/state
        view for each month.
      </p>
      <button
        type="button"
        onClick={login}
        disabled={busy}
        aria-busy={busy}
        className="primary-btn"
      >
        {busy ? "Connecting…" : "Continue with Google"}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
