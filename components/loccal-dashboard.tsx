"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { MonthGrid } from "@/components/month-grid";
import type { DayLocation, InferredEvent } from "@/lib/loccal";

interface ApiResponse {
  month: string;
  days: Record<string, DayLocation[]>;
  timeZone: string;
  generatedAt: string;
  generatedBy: string;
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

async function fetchMonth(month: string) {
  const response = await fetch(`/api/loccal/month?month=${month}`, {
    method: "GET",
    cache: "no-store"
  });

  const payload = (await response.json()) as ApiResponse | { error: string };

  if (!response.ok) {
    throw new Error((payload as { error: string }).error || "Failed to fetch month.");
  }

  return payload as ApiResponse;
}

export function LoccalDashboard({ userName }: { userName?: string | null }) {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    setLoading(true);
    fetchMonth(month)
      .then((result) => {
        if (canceled) return;
        setData(result);
        setError(null);
        setSelectedDateKey(null);
      })
      .catch((err: unknown) => {
        if (canceled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [month]);

  function goToMonth(offset: number) {
    const [year, monthNum] = month.split("-").map(Number);
    const nextDate = new Date(year, monthNum - 1 + offset, 1);
    const nextMonth = toMonthKey(nextDate);
    setMonth(nextMonth);
  }

  function formatDateLabel(dateKey: string) {
    const [year, monthNum, day] = dateKey.split("-").map(Number);
    return new Date(year, monthNum - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  const selectedDayLocations =
    data && selectedDateKey ? data.days[selectedDateKey] ?? [] : [];

  function formatTime(iso: string, timeZone: string) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
      .format(new Date(iso))
      .replace(" ", "");
  }

  function eventTimeLabel(event: InferredEvent, timeZone: string) {
    if (event.isAllDay) return "All day";
    return `${formatTime(event.startIso, timeZone)} - ${formatTime(event.endIso, timeZone)}`;
  }

  return (
    <main className="dashboard-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Loccal Monthly Map</p>
          <h1>{monthLabel(month)}</h1>
          <p>
            {userName ? `${userName}, this` : "This"} is your inferred daily location view from
            Google Calendar events.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-btn" onClick={() => goToMonth(-1)}>
            Previous
          </button>
          <button type="button" className="ghost-btn" onClick={() => goToMonth(1)}>
            Next
          </button>
          <button type="button" className="primary-btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {loading ? <p className="status">Loading month...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <>
          <MonthGrid
            monthKey={data.month}
            days={data.days}
            selectedDateKey={selectedDateKey}
            onSelectDate={(dateKey) =>
              setSelectedDateKey((current) => (current === dateKey ? null : dateKey))
            }
          />
          {selectedDateKey ? <button type="button" className="day-rail-backdrop" onClick={() => setSelectedDateKey(null)} aria-label="Close selected day panel" /> : null}
          {selectedDateKey ? (
            <aside className="day-side-panel" role="dialog" aria-modal="true">
              <div className="day-side-header">
                <p className="eyebrow">Selected day</p>
                <button
                  type="button"
                  className="ghost-btn close-panel-btn"
                  onClick={() => setSelectedDateKey(null)}
                >
                  Close
                </button>
              </div>
              <h2>{formatDateLabel(selectedDateKey)}</h2>
              {selectedDayLocations.length === 0 ? (
                <p>No city inferred for this date.</p>
              ) : (
                <div className="day-detail-list">
                  {selectedDayLocations.map((entry) => (
                    <article key={`${selectedDateKey}-${entry.location}`} className="day-detail-item">
                      <h3>{entry.location}</h3>
                      <ul>
                        {entry.events.map((event, eventIdx) => (
                          <li key={`${entry.location}-${event.title}-${eventIdx}`}>
                            <strong>{eventTimeLabel(event, data.timeZone)}</strong>: {event.title}
                            <br />
                            <span className="event-evidence">
                              inferred from{" "}
                              <a href={event.mapsUrl} target="_blank" rel="noreferrer">
                                {event.inferredFrom}
                              </a>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          ) : null}
          <p className="meta">
            Source timezone: <strong>{data.timeZone}</strong> · Generated by {data.generatedBy} ·
            Updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </main>
  );
}
