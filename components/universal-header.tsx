"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

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

function initialsFromName(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "");
    return parts.join("") || "U";
  }
  return email?.[0]?.toUpperCase() ?? "U";
}

export function UniversalHeader({ user }: UniversalHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
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

  return (
    <header className="topbar">
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
              className={`topbar-nav-link${pathname.startsWith("/dashboard") ? " active" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              href="/friends"
              className={`topbar-nav-link${pathname.startsWith("/friends") ? " active" : ""}`}
            >
              Friends
            </Link>
            <Link
              href="/settings"
              className={`topbar-nav-link${pathname.startsWith("/settings") ? " active" : ""}`}
            >
              Settings
            </Link>
          </nav>
        ) : (
          <nav className="topbar-nav" aria-label="Main navigation">
            <button type="button" className="primary-btn topbar-signin" onClick={() => signIn("google")}>
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
              <button type="button" className="avatar-btn ghost-avatar" onClick={() => signIn("google")}>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
