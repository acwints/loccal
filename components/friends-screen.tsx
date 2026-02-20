"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  FriendMonthResponse,
  FriendProfile,
  FriendRequestProfile,
  UserSearchResult
} from "@/lib/social-types";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function AvatarCell({
  name,
  email,
  avatarUrl
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="social-person">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="social-avatar" />
      ) : (
        <span className="social-avatar-fallback">{initialsFromName(name, email)}</span>
      )}
      <div>
        <p className="social-name">{name}</p>
        <p className="social-meta">{email}</p>
      </div>
    </div>
  );
}

export function FriendsScreen({ userName }: { userName?: string | null }) {
  const currentMonth = useMemo(() => toMonthKey(new Date()), []);
  const [networkVersion, setNetworkVersion] = useState(0);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequestProfile[]>([]);
  const [friendMonth, setFriendMonth] = useState<FriendMonthResponse | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  const friendMonthMap = useMemo(() => {
    const map = new Map<string, FriendMonthResponse["friends"][number]>();
    for (const friend of friendMonth?.friends ?? []) {
      map.set(friend.id, friend);
    }
    return map;
  }, [friendMonth]);

  const overlapDayCount = useMemo(
    () => (friendMonth ? Object.keys(friendMonth.overlaps).length : 0),
    [friendMonth]
  );
  const activeFriendCount = useMemo(
    () => (friendMonth ? friendMonth.friends.filter((entry) => entry.sharingEnabled).length : 0),
    [friendMonth]
  );
  const privateFriendCount = useMemo(
    () => (friendMonth ? friendMonth.friends.filter((entry) => !entry.sharingEnabled).length : 0),
    [friendMonth]
  );
  const staleFriendCount = useMemo(
    () =>
      friendMonth
        ? friendMonth.friends.filter((entry) => entry.sharingEnabled && entry.isStale).length
        : 0,
    [friendMonth]
  );

  useEffect(() => {
    let canceled = false;

    setNetworkLoading(true);
    setNetworkError(null);

    Promise.allSettled([
      fetchJson<FriendProfile[]>("/api/friends"),
      fetchJson<FriendRequestProfile[]>("/api/friends/requests"),
      fetchJson<FriendMonthResponse>(`/api/friends/month?month=${currentMonth}`)
    ])
      .then((results) => {
        if (canceled) return;

        const [friendsResult, requestsResult, monthResult] = results;
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

        if (monthResult.status === "fulfilled") {
          setFriendMonth(monthResult.value);
        } else {
          setFriendMonth(null);
          const reason = monthResult.reason;
          errors.push(reason instanceof Error ? reason.message : "Failed to load month insights.");
        }

        setNetworkError(errors.length > 0 ? errors.join(" ") : null);
      })
      .finally(() => {
        if (!canceled) setNetworkLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [currentMonth, networkVersion]);

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

    const timeoutId = window.setTimeout(() => {
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
    }, 240);

    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

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

  return (
    <main className="page-shell friends-shell">
      <header className="friends-hero">
        <div>
          <p className="eyebrow">Network</p>
          <h1>Friends</h1>
          <p>
            {userName
              ? `${userName}, manage requests, discover people, and tune who can view your travel overlap graph.`
              : "Manage requests, discover people, and tune who can view your travel overlap graph."}
          </p>
        </div>
        <div className="friends-hero-actions">
          <Link href="/dashboard" className="ghost-btn">
            Back to dashboard
          </Link>
          <Link href="/settings" className="ghost-btn">
            Sharing settings
          </Link>
        </div>
      </header>

      <section className="friends-metrics">
        <article className="friends-metric-card">
          <p className="eyebrow">Mutual friends</p>
          <h2>{friends.length}</h2>
          <p>People whose schedules can overlap with yours.</p>
        </article>
        <article className="friends-metric-card">
          <p className="eyebrow">Pending requests</p>
          <h2>{requests.length}</h2>
          <p>Incoming requests waiting for your decision.</p>
        </article>
        <article className="friends-metric-card">
          <p className="eyebrow">Networked overlaps</p>
          <h2>{overlapDayCount}</h2>
          <p>Days this month where at least one friend is in the same city.</p>
        </article>
        <article className="friends-metric-card">
          <p className="eyebrow">Active friends</p>
          <h2>{activeFriendCount}</h2>
          <p>Friends currently sharing travel snapshots with you.</p>
        </article>
      </section>

      {privateFriendCount + staleFriendCount > 0 ? (
        <p className="settings-help">
          Attention: {privateFriendCount} private + {staleFriendCount} stale friend snapshots.
        </p>
      ) : null}

      {networkLoading ? <p className="status">Loading network...</p> : null}
      {networkError ? <p className="error">{networkError}</p> : null}

      <section className="friends-layout">
        <article className="friends-card friends-card-discover">
          <div className="friends-card-head">
            <div>
              <p className="eyebrow">Discover</p>
              <h2>Find and add friends</h2>
            </div>
            <p className="settings-help">Search by name or email.</p>
          </div>

          <div className="social-search-row">
            <label htmlFor="friends-search" className="social-search-label">
              Search users
            </label>
            <input
              id="friends-search"
              className="settings-input"
              placeholder="Start typing a name or email"
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
                <AvatarCell name={person.name} email={person.email} avatarUrl={person.avatarUrl} />

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

        <div className="friends-stack">
          <article className="friends-card">
            <div className="friends-card-head">
              <div>
                <p className="eyebrow">Connected</p>
                <h2>Friends ({friends.length})</h2>
              </div>
            </div>

            {friends.length === 0 ? (
              <p className="settings-help">No friends yet. Send requests from Discover.</p>
            ) : (
              <ul className="social-list">
                {friends.map((friend) => {
                  const friendMonthRow = friendMonthMap.get(friend.id);
                  const sharing = friendMonthRow?.sharingEnabled ?? true;
                  const stale = friendMonthRow?.isStale ?? false;

                  return (
                    <li key={friend.id} className="social-item social-item-stack">
                      <AvatarCell name={friend.name} email={friend.email} avatarUrl={friend.avatarUrl} />
                      <div className="friend-chip-row">
                        {!sharing ? <span className="friend-chip">Private</span> : null}
                        {stale ? <span className="friend-chip friend-chip-warn">Stale</span> : null}
                        {friendMonthRow?.lastSharedAt ? (
                          <span className="friend-chip friend-chip-subtle">
                            Updated {new Date(friendMonthRow.lastSharedAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="friends-card">
            <div className="friends-card-head">
              <div>
                <p className="eyebrow">Queue</p>
                <h2>Pending requests ({requests.length})</h2>
              </div>
            </div>

            {requests.length === 0 ? (
              <p className="settings-help">No pending requests.</p>
            ) : (
              <ul className="social-list">
                {requests.map((request) => (
                  <li key={request.id} className="social-item social-item-stack">
                    <AvatarCell name={request.name} email={request.email} avatarUrl={request.avatarUrl} />
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
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
