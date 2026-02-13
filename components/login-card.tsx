"use client";

import { signIn } from "next-auth/react";

export function LoginCard() {
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
        onClick={() => signIn("google")}
        className="primary-btn"
      >
        Continue with Google
      </button>
    </section>
  );
}
