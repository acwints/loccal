import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginCard } from "@/components/login-card";
import { UniversalHeader } from "@/components/universal-header";
import { getAuthOptions } from "@/lib/auth";

export default async function PublicHomePage() {
  const session = await getServerSession(getAuthOptions());
  if (session) {
    redirect("/dashboard");
  }

  return (
    <>
      <UniversalHeader />
      <main className="signin-shell">
        <section className="marketing-hero">
          <p className="eyebrow">Calendar-Based Location Intelligence</p>
          <h1>Your month at a glance, city by city.</h1>
          <p>
            Loccal reads your Google Calendar, infers where you are each day, and gives you a
            clean monthly map with explainable event evidence.
          </p>
          <div className="marketing-links">
            <Link href="#how-it-works" className="ghost-btn">
              How it works
            </Link>
          </div>
        </section>

        <LoginCard />

        <section id="how-it-works" className="marketing-grid">
          <article className="marketing-card">
            <h2>Infer</h2>
            <p>Parses event locations and validates city/state inference with geocoding.</p>
          </article>
          <article className="marketing-card">
            <h2>Review</h2>
            <p>Click any day to inspect which events drove the inferred location.</p>
          </article>
          <article className="marketing-card">
            <h2>Customize</h2>
            <p>Set a home fallback and style day cells by city in your settings.</p>
          </article>
        </section>
      </main>
    </>
  );
}
