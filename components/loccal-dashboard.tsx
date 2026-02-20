"use client";

import { useEffect, useState } from "react";

import { MonthGrid } from "@/components/month-grid";
import type { DayLocation, InferredEvent } from "@/lib/loccal";
import { useLoccalSettings } from "@/lib/use-loccal-settings";
import { toCityStateLabel } from "@/lib/user-settings";

interface ApiResponse {
  month: string;
  days: Record<string, DayLocation[]>;
  timeZone: string;
  generatedAt: string;
  generatedBy: string;
  socialSnapshotSaved?: boolean;
}

interface FriendProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface FriendRequestProfile {
  id: string;
  requesterId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: "pending";
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  relationshipStatus: "none" | "friends" | "pendingOutgoing" | "pendingIncoming";
  incomingRequestId: string | null;
}

interface FriendMonthSchedule {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  generatedAt: string | null;
  timeZone: string | null;
  days: Record<string, DayLocation[]>;
  sharingEnabled: boolean;
  isStale: boolean;
  lastSharedAt: string | null;
}

interface FriendMonthOverlap {
  friendIds: string[];
  friendNames: string[];
  cities: string[];
}

interface FriendMonthResponse {
  month: string;
  ownSnapshotAvailable: boolean;
  friends: FriendMonthSchedule[];
  overlaps: Record<string, FriendMonthOverlap>;
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

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init
  });

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

function initialsFromName(name: string, email: string) {
  const trimmedName = name.trim();
  if (trimmedName) {
    return trimmedName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email[0]?.toUpperCase() ?? "U";
}

export function LoccalDashboard({ userName }: { userName?: string | null }) {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [friendMonth, setFriendMonth] = useState<FriendMonthResponse | null>(null);
  const [friendMonthError, setFriendMonthError] = useState<string | null>(null);
  const [friendMonthLoading, setFriendMonthLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkVersion, setNetworkVersion] = useState(0);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequestProfile[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const { ready: settingsReady, settings } = useLoccalSettings();

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
    let canceled = false;

    setNetworkLoading(true);
    setNetworkError(null);

    Promise.allSettled([
      fetchJson<FriendProfile[]>("/api/friends"),
      fetchJson<FriendRequestProfile[]>("/api/friends/requests")
    ])
      .then((results) => {
        if (canceled) return;

        const [friendsResult, requestsResult] = results;
        const errors: string[] = [];

        if (friendsResult.status === "fulfilled") {
          setFriends(friendsResult.value);
        } else {
          setFriends([]);
          const reason = friendsResult.reason;
          errors.push(reason instanceof Error ? reason.message : "Failed to load friends.");
        }

        if (requestsResult.status === "fulfilled") {
          setRequests(requestsResult.value);
        } else {
          setRequests([]);
          const reason = requestsResult.reason;
          errors.push(reason instanceof Error ? reason.message : "Failed to load requests.");
        }

        setNetworkError(errors.length > 0 ? errors.join(" ") : null);
      })
      .finally(() => {
        if (!canceled) setNetworkLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [networkVersion]);

  useEffect(() => {
    if (!data || data.month !== month) return;

    let canceled = false;
    setFriendMonthLoading(true);

    fetchJson<FriendMonthResponse>(`/api/friends/month?month=${month}`)
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
  }, [data?.generatedAt, data?.month, month, networkVersion]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let canceled = false;
    setSearchLoading(true);

    fetchJson<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(trimmed)}`)
      .then((results) => {
        if (canceled) return;
        setSearchResults(results);
        setSearchError(null);
      })
      .catch((err: unknown) => {
        if (canceled) return;
        setSearchError(err instanceof Error ? err.message : "Failed to search users.");
      })
      .finally(() => {
        if (!canceled) setSearchLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [networkVersion, searchQuery]);

  async function runNetworkAction(actionKey: string, url: string, body: Record<string, string>) {
    setActionLoadingKey(actionKey);
    setNetworkError(null);

    try {
      await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      setNetworkVersion((current) => current + 1);
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : "Network action failed.");
    } finally {
      setActionLoadingKey(null);
    }
  }

  function sendFriendRequest(targetId: string) {
    return runNetworkAction(`request:${targetId}`, "/api/friends/request", { targetId });
  }

  function approveRequest(requestId: string) {
    return runNetworkAction(`approve:${requestId}`, "/api/friends/approve", { requestId });
  }

  function denyRequest(requestId: string) {
    return runNetworkAction(`deny:${requestId}`, "/api/friends/deny", { requestId });
  }

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
      ? friendMonth.friends
          .map((friend) => ({
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
        </div>
      </header>

      {loading ? <p className="status">Loading month...</p> : null}
      {!settingsReady ? <p className="status">Loading settings…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {data?.socialSnapshotSaved === false ? (
        <p className="error">
          Your calendar loaded, but social snapshot sync failed. Friend overlaps may be stale.
        </p>
      ) : null}
      {friendMonthLoading ? <p className="status">Loading friend schedule overlaps...</p> : null}
      {friendMonthError ? <p className="error">{friendMonthError}</p> : null}
      {networkError ? <p className="error">{networkError}</p> : null}

      <section className="social-layout">
        <article className="social-card">
          <p className="eyebrow">Discover people</p>
          <h2>Find and add friends</h2>
          <p className="settings-help">
            Search by name or email, then send a request. Once approved, month overlaps appear on the
            calendar.
          </p>
          <div className="social-search-row">
            <input
              className="settings-input"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          {searchLoading ? <p className="status">Searching users...</p> : null}
          {searchError ? <p className="error">{searchError}</p> : null}
          {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 ? (
            <p className="settings-help">No matching users found.</p>
          ) : null}
          <ul className="social-list">
            {searchResults.map((person) => (
              <li key={person.id} className="social-item">
                <div className="social-person">
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt={person.name} className="social-avatar" />
                  ) : (
                    <span className="social-avatar-fallback">
                      {initialsFromName(person.name, person.email)}
                    </span>
                  )}
                  <div>
                    <p className="social-name">{person.name}</p>
                    <p className="social-meta">{person.email}</p>
                  </div>
                </div>

                {person.relationshipStatus === "friends" ? (
                  <button type="button" className="ghost-btn social-btn" disabled>
                    Friends
                  </button>
                ) : null}
                {person.relationshipStatus === "pendingOutgoing" ? (
                  <button type="button" className="ghost-btn social-btn" disabled>
                    Pending
                  </button>
                ) : null}
                {person.relationshipStatus === "none" ? (
                  <button
                    type="button"
                    className="ghost-btn social-btn"
                    disabled={actionLoadingKey === `request:${person.id}`}
                    onClick={() => sendFriendRequest(person.id)}
                  >
                    {actionLoadingKey === `request:${person.id}` ? "Sending..." : "Add friend"}
                  </button>
                ) : null}
                {person.relationshipStatus === "pendingIncoming" ? (
                  <button
                    type="button"
                    className="ghost-btn social-btn"
                    disabled={
                      !person.incomingRequestId ||
                      actionLoadingKey === `approve:${person.incomingRequestId}`
                    }
                    onClick={() => {
                      if (!person.incomingRequestId) return;
                      approveRequest(person.incomingRequestId);
                    }}
                  >
                    {person.incomingRequestId &&
                    actionLoadingKey === `approve:${person.incomingRequestId}`
                      ? "Approving..."
                      : "Approve"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </article>

        <article className="social-card">
          <p className="eyebrow">Network</p>
          <h2>Friends ({friends.length})</h2>
          {networkLoading ? <p className="status">Loading friends...</p> : null}
          {!networkLoading && friends.length === 0 ? (
            <p className="settings-help">No friends yet. Send a request from Discover.</p>
          ) : null}
          <ul className="social-list">
            {friends.map((friend) => (
              <li key={friend.id} className="social-item social-item-static">
                <div className="social-person">
                  {friend.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friend.avatarUrl} alt={friend.name} className="social-avatar" />
                  ) : (
                    <span className="social-avatar-fallback">
                      {initialsFromName(friend.name, friend.email)}
                    </span>
                  )}
                  <div>
                    <p className="social-name">{friend.name}</p>
                    <p className="social-meta">{friend.email}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="social-card">
          <p className="eyebrow">Pending</p>
          <h2>Friend requests ({requests.length})</h2>
          {networkLoading ? <p className="status">Loading requests...</p> : null}
          {!networkLoading && requests.length === 0 ? (
            <p className="settings-help">No pending requests.</p>
          ) : null}
          <ul className="social-list">
            {requests.map((request) => (
              <li key={request.id} className="social-item social-item-stack">
                <div className="social-person">
                  {request.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={request.avatarUrl} alt={request.name} className="social-avatar" />
                  ) : (
                    <span className="social-avatar-fallback">
                      {initialsFromName(request.name, request.email)}
                    </span>
                  )}
                  <div>
                    <p className="social-name">{request.name}</p>
                    <p className="social-meta">{request.email}</p>
                  </div>
                </div>
                <div className="social-actions">
                  <button
                    type="button"
                    className="ghost-btn social-btn"
                    onClick={() => approveRequest(request.id)}
                    disabled={actionLoadingKey === `approve:${request.id}`}
                  >
                    {actionLoadingKey === `approve:${request.id}` ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn social-btn social-btn-danger"
                    onClick={() => denyRequest(request.id)}
                    disabled={actionLoadingKey === `deny:${request.id}`}
                  >
                    {actionLoadingKey === `deny:${request.id}` ? "Denying..." : "Deny"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {data ? (
        <>
          <MonthGrid
            monthKey={data.month}
            days={data.days}
            settings={settings}
            overlaps={friendMonth?.overlaps}
            selectedDateKey={selectedDateKey}
            onSelectDate={(dateKey) =>
              setSelectedDateKey((current) => (current === dateKey ? null : dateKey))
            }
          />
          {selectedDateKey ? (
            <button
              type="button"
              className="day-rail-backdrop"
              onClick={() => setSelectedDateKey(null)}
              aria-label="Close selected day panel"
            />
          ) : null}
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
                <p>&nbsp;</p>
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
