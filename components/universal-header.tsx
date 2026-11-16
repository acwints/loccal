"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { signInToLoccal } from "@/lib/sign-in";
import { useEffect, useMemo, useState } from "react";

import { initialsFromName } from "@/lib/format-utils";

interface HeaderUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UniversalHeaderProps {
  user?: HeaderUser | null;
}

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "loccal.theme";

export function UniversalHeader({ user }: UniversalHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [signInError, setSignInError] = useState("");
  const isAuthed = Boolean(user);
  const initials = useMemo(() => initialsFromName(user?.name, user?.email), [user]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const preferred =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    document.documentElement.setAttribute("data-theme", preferred);
    setTheme(preferred);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  async function login() {
    setSignInError("");
    try { await signInToLoccal(); }
    catch { setSignInError("Sign-in could not start. Please try again."); }
  }

  return (
    <header className={`topbar${isAuthed ? " topbar-authed" : ""}`}>
      <div className="topbar-inner">
        <Link href={isAuthed ? "/dashboard" : "/"} className="brand-link">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/icon.svg" alt="" width={34} height={34} className="brand-mark-img" priority />
          </span>
          <span className="brand-text">Loccal</span>
        </Link>

        {isAuthed ? (
          <nav className="topbar-nav" aria-label="Main navigation">
            <Link
              href="/dashboard"
              aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
              className={`topbar-nav-link${pathname.startsWith("/dashboard") ? " active" : ""}`}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-14 5h3m4 0h3" /></svg>
              <span>Calendar</span>
            </Link>
            <Link
              href="/friends"
              aria-current={pathname.startsWith("/friends") ? "page" : undefined}
              className={`topbar-nav-link${pathname.startsWith("/friends") ? " active" : ""}`}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" /></svg>
              <span>Friends</span>
            </Link>
            <Link
              href="/settings"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={`topbar-nav-link${pathname.startsWith("/settings") ? " active" : ""}`}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--bg)" /><circle cx="15" cy="17" r="3" fill="var(--bg)" /></svg>
              <span>Settings</span>
            </Link>
          </nav>
        ) : (
          <nav className="topbar-nav" aria-label="Main navigation">
            <button type="button" className="primary-btn topbar-signin" onClick={login}>
              Sign in
            </button>
          </nav>
        )}

        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
          </button>
          {isAuthed ? (
            <div className="avatar-menu-wrap">
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? "User avatar"} />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
              {menuOpen ? (
                <div className="avatar-menu" role="menu">
                  <p className="avatar-name">{user?.name || "Signed in"}</p>
                  {user?.email ? <p className="avatar-email">{user.email}</p> : null}
                  <Link href="/dashboard" className="avatar-menu-link" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/friends" className="avatar-menu-link" onClick={() => setMenuOpen(false)}>
                    Friends
                  </Link>
                  <Link href="/settings" className="avatar-menu-link" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="avatar-menu-signout"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="avatar-menu-wrap">
              <button type="button" aria-label="Sign in" className="avatar-btn ghost-avatar" onClick={login}>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {signInError && <p role="alert" className="error">{signInError}</p>}
    </header>
  );
}
