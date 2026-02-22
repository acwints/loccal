"use client";
import { useEffect, useState } from "react";

import { MonthGrid } from "@/components/month-grid";
import { YearContributionGraph } from "@/components/year-contribution-graph";
import type { InferredEvent } from "@/lib/loccal";
import type { FriendMonthResponse } from "@/lib/social-types";
import { useLoccalSettings } from "@/lib/use-loccal-settings";
import { toCityStateLabel } from "@/lib/user-settings";

interface ApiResponse {
  month: string;
  days: Record<string, { location: string; events: InferredEvent[] }[]>;
  timeZone: string;
  generatedAt: string;
  generatedBy: string;
  socialSnapshotSaved?: boolean;
}

interface YearApiResponse {
  year: string;
  days: Record<string, { location: string; events: InferredEvent[] }[]>;
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

async function fetchFriendMonth(month: string) {
  const response = await fetch(`/api/friends/month?month=${month}`, {
    method: "GET",
    cache: "no-store"
  });
  const payload = (await response.json()) as FriendMonthResponse | { error?: string };

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error ?? "Failed to load friend month.");
  }

  return payload as FriendMonthResponse;
}

async function fetchYear(year: string) {
  const response = await fetch(`/api/loccal/year?year=${year}`, {
    method: "GET",
    cache: "no-store"
  });

  const payload = (await response.json()) as YearApiResponse | { error: string };

  if (!response.ok) {
    throw new Error((payload as { error: string }).error || "Failed to fetch year.");
  }

  return payload as YearApiResponse;
}

export function LoccalDashboard() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [friendMonth, setFriendMonth] = useState<FriendMonthResponse | null>(null);
  const [friendMonthError, setFriendMonthError] = useState<string | null>(null);
  const [friendMonthLoading, setFriendMonthLoading] = useState(false);
  const [yearData, setYearData] = useState<YearApiResponse | null>(null);
  const [yearLoading, setYearLoading] = useState(false);
  const [yearError, setYearError] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready: settingsReady, settings } = useLoccalSettings();
  const selectedYear = month.slice(0, 4);

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

  useEffect(() => {
    if (!data || data.month !== month) return;

    let canceled = false;
    setFriendMonthLoading(true);

    fetchFriendMonth(month)
      .then((payload) => {
        if (canceled) return;
        setFriendMonth(payload);
        setFriendMonthError(null);
      })
      .catch((err: unknown) => {
        if (canceled) return;
        setFriendMonthError(err instanceof Error ? err.message : "Failed to load friend month.");
      })
      .finally(() => {
        if (!canceled) setFriendMonthLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [data?.generatedAt, data?.month, month]);

  useEffect(() => {
    let canceled = false;
    setYearLoading(true);

    fetchYear(selectedYear)
      .then((result) => {
        if (canceled) return;
        setYearData(result);
        setYearError(null);
      })
      .catch((err: unknown) => {
        if (canceled) return;
        setYearError(err instanceof Error ? err.message : "Failed to load yearly footprint.");
      })
      .finally(() => {
        if (!canceled) setYearLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [selectedYear]);

  // Close modal on Escape
  useEffect(() => {
    if (!selectedDateKey) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDateKey(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDateKey]);

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
  const selectedHomeFallback =
    selectedDateKey && selectedDayLocations.length === 0 && settings.homeLocation
      ? toCityStateLabel(settings.homeLocation)
      : null;
  const selectedFriendSchedules =
    friendMonth && selectedDateKey
      ? friendMonth.friends.map((friend) => ({
          ...friend,
          dayLocations: friend.days[selectedDateKey] ?? []
        }))
      : [];
  const selectedVisibleFriendSchedules = selectedFriendSchedules.filter(
    (friend) => friend.sharingEnabled && friend.dayLocations.length > 0
  );
  const selectedPrivateFriends = selectedFriendSchedules.filter((friend) => !friend.sharingEnabled);
  const selectedNoDataFriends = selectedFriendSchedules.filter(
    (friend) => friend.sharingEnabled && friend.dayLocations.length === 0
  );
  const selectedOverlap = selectedDateKey ? friendMonth?.overlaps[selectedDateKey] ?? null : null;

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

  const showSkeleton = !data && loading;

  return (
    <main className="dashboard-shell">
      {error ? <p className="error">{error}</p> : null}
      {data?.socialSnapshotSaved === false ? (
        <p className="error">
          Your calendar loaded, but social snapshot sync failed. Friend overlaps may be stale.
        </p>
      ) : null}
      {friendMonthError ? <p className="error">{friendMonthError}</p> : null}
      {yearError ? <p className="error">{yearError}</p> : null}

      {showSkeleton ? (
        <div className="dashboard-split">
          <div className="dashboard-split-main">
            <div className="month-grid-wrap">
              <div className="month-grid-toolbar">
                <div className="sk" style={{ width: 140, height: 18 }} />
                <div className="month-grid-toolbar-actions">
                  <div className="sk" style={{ width: 64, height: 28, borderRadius: 6 }} />
                  <div className="sk" style={{ width: 48, height: 28, borderRadius: 6 }} />
                </div>
              </div>
              <div className="weekdays">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="weekday-cell">{d}</div>
                ))}
              </div>
              <div className="month-grid">
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="day-cell" style={{ padding: "0.4rem" }}>
                    <div className="sk" style={{ width: 18, height: 14, marginBottom: 6 }} />
                    <div className="sk" style={{ width: "70%", height: 10, marginBottom: 4 }} />
                    <div className="sk" style={{ width: "50%", height: 10 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dashboard-split-side">
            <div className="year-graph-card">
              <div className="sk" style={{ width: 120, height: 16, marginBottom: 8 }} />
              <div className="sk" style={{ width: "100%", height: 140, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="dashboard-split">
            <div className={`dashboard-split-main${loading ? " sk-grid-loading" : ""}`}>
              <MonthGrid
                monthKey={data.month}
                days={data.days}
                backfillDays={yearData?.days}
                settings={settings}
                title={monthLabel(month)}
                onPrevMonth={() => goToMonth(-1)}
                onNextMonth={() => goToMonth(1)}
                overlaps={friendMonth?.overlaps}
                selectedDateKey={selectedDateKey}
                onSelectDate={(dateKey) =>
                  setSelectedDateKey((current) => (current === dateKey ? null : dateKey))
                }
              />
            </div>
            <div className="dashboard-split-side">
              {yearData ? (
                <YearContributionGraph
                  year={Number(yearData.year)}
                  days={yearData.days}
                  settings={settings}
                  selectedDateKey={selectedDateKey}
                  onSelectDate={(dateKey) =>
                    setSelectedDateKey((current) => (current === dateKey ? null : dateKey))
                  }
                  compact
                />
              ) : (
                <div className="year-graph-card">
                  <div className="sk" style={{ width: 120, height: 16, marginBottom: 8 }} />
                  <div className="sk" style={{ width: "100%", height: 140, borderRadius: 4 }} />
                </div>
              )}
            </div>
          </div>

          {/* Center modal overlay */}
          {selectedDateKey ? (
            <div className="modal-backdrop" onClick={() => setSelectedDateKey(null)}>
              <dialog
                className="day-modal"
                open
                onClick={(e) => e.stopPropagation()}
                aria-modal="true"
                aria-label="Day details"
              >
                <div className="day-modal-header">
                  <div>
                    <p className="eyebrow">Selected day</p>
                    <h2>{formatDateLabel(selectedDateKey)}</h2>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn modal-close-btn"
                    onClick={() => setSelectedDateKey(null)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="day-modal-body">
                  {selectedDayLocations.length === 0 && selectedHomeFallback ? (
                    <article className="day-detail-item">
                      <h3>{selectedHomeFallback}</h3>
                      <p className="settings-help">Home default used for this day (no inferred travel).</p>
                    </article>
                  ) : null}
                  {selectedOverlap ? (
                    <article className="day-detail-item overlap-detail-item">
                      <h3>Friend overlap</h3>
                      <p className="settings-help">
                        You overlap with {selectedOverlap.friendNames.join(", ")} in{" "}
                        {selectedOverlap.cities.map((city) => toCityStateLabel(city)).join(", ")}.
                      </p>
                    </article>
                  ) : null}
                  {selectedDayLocations.length === 0 && !selectedHomeFallback ? (
                    <p className="settings-help">No location data for this day.</p>
                  ) : (
                    <div className="day-detail-list">
                      {selectedDayLocations.map((entry) => (
                        <article key={`${selectedDateKey}-${entry.location}`} className="day-detail-item">
                          <h3>{toCityStateLabel(entry.location)}</h3>
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

                  <div className="friend-day-section">
                    <h3>Friend schedules</h3>
                    {!friendMonth?.ownSnapshotAvailable ? (
                      <p className="settings-help">
                        Open a month once to publish your snapshot and enable overlap comparisons.
                      </p>
                    ) : null}
                    {selectedVisibleFriendSchedules.length === 0 ? (
                      <p className="settings-help">
                        No friend travel entries recorded for this date.
                      </p>
                    ) : (
                      <div className="day-detail-list">
                        {selectedVisibleFriendSchedules.map((friend) => (
                          <article key={`${selectedDateKey}-${friend.id}`} className="day-detail-item">
                            <h3>
                              {friend.name}
                              {friend.isStale ? <span className="friend-stale-tag">Stale snapshot</span> : null}
                            </h3>
                            <ul>
                              {friend.dayLocations.map((locationEntry) => (
                                <li key={`${friend.id}-${locationEntry.location}`}>
                                  <strong>{toCityStateLabel(locationEntry.location)}</strong> ·{" "}
                                  {locationEntry.events.length} event
                                  {locationEntry.events.length === 1 ? "" : "s"}
                                </li>
                              ))}
                            </ul>
                            {friend.generatedAt ? (
                              <p className="settings-help">
                                Last updated {new Date(friend.generatedAt).toLocaleString()}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                    {selectedPrivateFriends.length > 0 ? (
                      <p className="settings-help">
                        Hidden by privacy settings: {selectedPrivateFriends.map((friend) => friend.name).join(", ")}.
                      </p>
                    ) : null}
                    {selectedNoDataFriends.length > 0 ? (
                      <p className="settings-help">
                        No snapshot for this date: {selectedNoDataFriends.map((friend) => friend.name).join(", ")}.
                      </p>
                    ) : null}
                  </div>
                </div>
              </dialog>
            </div>
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
