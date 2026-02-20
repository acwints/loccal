import {
  SocialFollowRequestStatus,
  SocialShareMode as PrismaSocialShareMode
} from "@prisma/client";

import type { DayLocation } from "@/lib/loccal";
import { prisma } from "@/lib/prisma";
import { coerceDayLocationRecord } from "@/lib/social-store";

const REQUEST_STATUS_PENDING = SocialFollowRequestStatus.PENDING;
const REQUEST_STATUS_APPROVED = SocialFollowRequestStatus.APPROVED;
const REQUEST_STATUS_DENIED = SocialFollowRequestStatus.DENIED;

interface ActionError {
  ok: false;
  status: number;
  error: string;
}

interface ActionSuccess<T> {
  ok: true;
  status: number;
  body: T;
}

type ActionResult<T> = ActionError | ActionSuccess<T>;

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  relationshipStatus: "none" | "friends" | "pendingOutgoing" | "pendingIncoming";
  incomingRequestId: string | null;
}

export interface FriendProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface FriendRequestProfile {
  id: string;
  requesterId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: "pending";
}

export interface FriendMonthSchedule {
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

export interface FriendMonthOverlap {
  friendIds: string[];
  friendNames: string[];
  cities: string[];
}

export interface FriendMonthResponse {
  month: string;
  ownSnapshotAvailable: boolean;
  friends: FriendMonthSchedule[];
  overlaps: Record<string, FriendMonthOverlap>;
}

function normalizeQuery(query: string) {
  return query.trim();
}

function canonicalLocation(location: string) {
  return location.trim().toLowerCase();
}

function isSharingEnabled(mode: PrismaSocialShareMode) {
  return mode === PrismaSocialShareMode.FRIENDS;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function getStaleThresholdHours() {
  const raw = process.env.LOCCAL_SNAPSHOT_STALE_HOURS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 72;
  return parsed;
}

function isSnapshotStale(generatedAt: Date | null) {
  if (!generatedAt) return true;
  const thresholdHours = getStaleThresholdHours();
  const ageMs = Date.now() - generatedAt.getTime();
  return ageMs > thresholdHours * 60 * 60 * 1000;
}

function computeOverlap(
  ownDays: Record<string, DayLocation[]>,
  friendDays: Record<string, DayLocation[]>
) {
  const overlaps: Record<string, string[]> = {};
  const allDateKeys = new Set([...Object.keys(ownDays), ...Object.keys(friendDays)]);

  for (const dateKey of allDateKeys) {
    const ownLocations = ownDays[dateKey] ?? [];
    const friendLocations = friendDays[dateKey] ?? [];
    if (ownLocations.length === 0 || friendLocations.length === 0) continue;

    const ownMap = new Map(ownLocations.map((entry) => [canonicalLocation(entry.location), entry.location]));
    const shared = friendLocations
      .map((entry) => canonicalLocation(entry.location))
      .filter((location) => ownMap.has(location))
      .map((location) => ownMap.get(location) as string);

    if (shared.length > 0) {
      overlaps[dateKey] = Array.from(new Set(shared));
    }
  }

  return overlaps;
}

export async function listFriends(userId: string) {
  const friendships = await prisma.socialFollow.findMany({
    where: {
      followerId: userId,
      followee: {
        following: {
          some: { followeeId: userId }
        }
      }
    },
    include: {
      followee: {
        select: { id: true, name: true, email: true, avatarUrl: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return friendships.map((entry) => ({
    id: entry.followee.id,
    name: entry.followee.name,
    email: entry.followee.email,
    avatarUrl: entry.followee.avatarUrl
  } satisfies FriendProfile));
}

export async function listIncomingFriendRequests(userId: string) {
  const requests = await prisma.socialFollowRequest.findMany({
    where: { targetId: userId, status: REQUEST_STATUS_PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
        select: { id: true, name: true, email: true, avatarUrl: true }
      }
    }
  });

  return requests.map((request) => ({
    id: request.id,
    requesterId: request.requesterId,
    name: request.requester.name,
    email: request.requester.email,
    avatarUrl: request.requester.avatarUrl,
    status: "pending"
  } satisfies FriendRequestProfile));
}

export async function searchUsers(userId: string, query: string) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) {
    return {
      ok: false,
      status: 400,
      error: "Query must be at least 2 characters"
    } as const;
  }

  const users = await prisma.socialUser.findMany({
    where: {
      NOT: { id: userId },
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { email: { contains: normalized, mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    take: 10
  });

  const ids = users.map((entry) => entry.id);
  if (ids.length === 0) {
    return { ok: true, status: 200, body: [] } as const;
  }

  const [outgoingFollows, incomingFollows, outgoingRequests, incomingRequests] = await Promise.all([
    prisma.socialFollow.findMany({
      where: { followerId: userId, followeeId: { in: ids } },
      select: { followeeId: true }
    }),
    prisma.socialFollow.findMany({
      where: { followerId: { in: ids }, followeeId: userId },
      select: { followerId: true }
    }),
    prisma.socialFollowRequest.findMany({
      where: { requesterId: userId, targetId: { in: ids } },
      select: { targetId: true, status: true }
    }),
    prisma.socialFollowRequest.findMany({
      where: { requesterId: { in: ids }, targetId: userId, status: REQUEST_STATUS_PENDING },
      select: { requesterId: true, id: true }
    })
  ]);

  const outgoingFollowSet = new Set(outgoingFollows.map((entry) => entry.followeeId));
  const incomingFollowSet = new Set(incomingFollows.map((entry) => entry.followerId));
  const outgoingRequestMap = new Map(outgoingRequests.map((entry) => [entry.targetId, entry.status]));
  const incomingRequestMap = new Map(
    incomingRequests.map((entry) => [entry.requesterId, entry.id])
  );

  const body = users.map((entry) => {
    const isMutual = outgoingFollowSet.has(entry.id) && incomingFollowSet.has(entry.id);
    const outgoingRequestStatus = outgoingRequestMap.get(entry.id);
    const incomingRequestId = incomingRequestMap.get(entry.id) ?? null;

    const relationshipStatus: UserSearchResult["relationshipStatus"] = isMutual
      ? "friends"
      : outgoingRequestStatus === REQUEST_STATUS_PENDING
        ? "pendingOutgoing"
        : incomingRequestId
          ? "pendingIncoming"
          : "none";

    return {
      id: entry.id,
      name: entry.name,
      email: entry.email,
      avatarUrl: entry.avatarUrl,
      relationshipStatus,
      incomingRequestId: relationshipStatus === "pendingIncoming" ? incomingRequestId : null
    } satisfies UserSearchResult;
  });

  return {
    ok: true,
    status: 200,
    body
  } as const;
}

export async function requestConnection(requesterId: string, targetId: string | undefined) {
  const result = await prisma.$transaction<ActionResult<{ status: string; mutual?: boolean }>>(
    async (tx) => {
      if (!targetId) {
        return { ok: false, status: 400, error: "targetId is required" };
      }
      if (targetId === requesterId) {
        return { ok: false, status: 400, error: "You cannot send a request to yourself" };
      }

      const target = await tx.socialUser.findUnique({
        where: { id: targetId },
        select: { id: true }
      });

      if (!target) {
        return { ok: false, status: 404, error: "Target user not found" };
      }

      const [viewerToTarget, targetToViewer, outgoingRequest, incomingRequest] = await Promise.all([
        tx.socialFollow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: requesterId,
              followeeId: targetId
            }
          },
          select: { id: true }
        }),
        tx.socialFollow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: targetId,
              followeeId: requesterId
            }
          },
          select: { id: true }
        }),
        tx.socialFollowRequest.findUnique({
          where: {
            requesterId_targetId: {
              requesterId,
              targetId
            }
          },
          select: { id: true, status: true }
        }),
        tx.socialFollowRequest.findUnique({
          where: {
            requesterId_targetId: {
              requesterId: targetId,
              targetId: requesterId
            }
          },
          select: { id: true, status: true }
        })
      ]);

      if (incomingRequest?.status === REQUEST_STATUS_PENDING) {
        await tx.socialFollowRequest.update({
          where: { id: incomingRequest.id },
          data: { status: REQUEST_STATUS_APPROVED }
        });
        await tx.socialFollow.createMany({
          data: [
            { followerId: requesterId, followeeId: targetId },
            { followerId: targetId, followeeId: requesterId }
          ],
          skipDuplicates: true
        });
        return {
          ok: true,
          status: 200,
          body: { status: "friends", mutual: true }
        };
      }

      if (viewerToTarget && targetToViewer) {
        return {
          ok: true,
          status: 200,
          body: { status: "friends", mutual: true }
        };
      }

      if (outgoingRequest?.status === REQUEST_STATUS_PENDING) {
        return {
          ok: true,
          status: 200,
          body: { status: "pending" }
        };
      }

      if (outgoingRequest?.status === REQUEST_STATUS_APPROVED || viewerToTarget) {
        await tx.socialFollow.createMany({
          data: [
            { followerId: requesterId, followeeId: targetId },
            { followerId: targetId, followeeId: requesterId }
          ],
          skipDuplicates: true
        });
        return {
          ok: true,
          status: 200,
          body: { status: "friends", mutual: true }
        };
      }

      await tx.socialFollowRequest.upsert({
        where: {
          requesterId_targetId: {
            requesterId,
            targetId
          }
        },
        create: {
          requesterId,
          targetId,
          status: REQUEST_STATUS_PENDING
        },
        update: {
          status: REQUEST_STATUS_PENDING
        }
      });

      return {
        ok: true,
        status: 200,
        body: { status: "pending" }
      };
    }
  );

  return result;
}

export async function approveConnection(targetId: string, requestId: string | undefined) {
  const result = await prisma.$transaction<ActionResult<{ ok: true; mutual: true }>>(async (tx) => {
    if (!requestId) {
      return { ok: false, status: 400, error: "requestId is required" };
    }

    const request = await tx.socialFollowRequest.findUnique({
      where: { id: requestId },
      select: { id: true, requesterId: true, targetId: true, status: true }
    });

    if (!request || request.targetId !== targetId) {
      return { ok: false, status: 404, error: "Request not found" };
    }

    if (request.status === REQUEST_STATUS_DENIED) {
      return { ok: false, status: 409, error: "This request was already denied" };
    }

    if (request.status !== REQUEST_STATUS_APPROVED) {
      await tx.socialFollowRequest.update({
        where: { id: request.id },
        data: { status: REQUEST_STATUS_APPROVED }
      });
    }

    await tx.socialFollow.createMany({
      data: [
        { followerId: request.requesterId, followeeId: request.targetId },
        { followerId: request.targetId, followeeId: request.requesterId }
      ],
      skipDuplicates: true
    });

    return {
      ok: true,
      status: 200,
      body: { ok: true, mutual: true }
    };
  });

  return result;
}

export async function denyConnection(targetId: string, requestId: string | undefined) {
  const result = await prisma.$transaction<ActionResult<{ ok: true }>>(async (tx) => {
    if (!requestId) {
      return { ok: false, status: 400, error: "requestId is required" };
    }

    const request = await tx.socialFollowRequest.findUnique({
      where: { id: requestId },
      select: { id: true, targetId: true, status: true }
    });

    if (!request || request.targetId !== targetId) {
      return { ok: false, status: 404, error: "Request not found" };
    }

    if (request.status === REQUEST_STATUS_APPROVED) {
      return { ok: false, status: 409, error: "Request already approved" };
    }

    if (request.status !== REQUEST_STATUS_DENIED) {
      await tx.socialFollowRequest.update({
        where: { id: request.id },
        data: { status: REQUEST_STATUS_DENIED }
      });
    }

    return { ok: true, status: 200, body: { ok: true } };
  });

  return result;
}

export async function buildFriendMonthResponse(
  userId: string,
  month: string
): Promise<FriendMonthResponse> {
  const ownSnapshot = await prisma.socialMonthlySnapshot.findUnique({
    where: {
      userId_month: {
        userId,
        month
      }
    },
    select: {
      generatedAt: true,
      days: true
    }
  });

  const friendshipRows = await prisma.socialFollow.findMany({
    where: {
      followerId: userId,
      followee: {
        following: {
          some: { followeeId: userId }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    select: {
      followee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          shareMode: true,
          lastSharedAt: true,
          monthlySnapshots: {
            where: { month },
            take: 1,
            orderBy: { generatedAt: "desc" },
            select: {
              generatedAt: true,
              timeZone: true,
              days: true
            }
          }
        }
      }
    }
  });

  const ownDays = coerceDayLocationRecord(ownSnapshot?.days ?? {});
  const friends: FriendMonthSchedule[] = friendshipRows.map((row) => {
    const friend = row.followee;
    const snapshot = friend.monthlySnapshots[0] ?? null;
    const sharingEnabled = isSharingEnabled(friend.shareMode);
    const visibleSnapshot = sharingEnabled ? snapshot : null;

    return {
      id: friend.id,
      name: friend.name,
      email: friend.email,
      avatarUrl: friend.avatarUrl,
      generatedAt: toIso(visibleSnapshot?.generatedAt ?? null),
      timeZone: visibleSnapshot?.timeZone ?? null,
      days: coerceDayLocationRecord(visibleSnapshot?.days ?? {}),
      sharingEnabled,
      isStale: isSnapshotStale(visibleSnapshot?.generatedAt ?? null),
      lastSharedAt: toIso(friend.lastSharedAt)
    };
  });

  const overlaps: Record<string, FriendMonthOverlap> = {};
  if (ownSnapshot) {
    for (const friend of friends) {
      if (!friend.sharingEnabled || Object.keys(friend.days).length === 0) continue;
      const friendOverlap = computeOverlap(ownDays, friend.days);

      for (const [dateKey, cities] of Object.entries(friendOverlap)) {
        if (!overlaps[dateKey]) {
          overlaps[dateKey] = {
            friendIds: [],
            friendNames: [],
            cities: []
          };
        }

        const entry = overlaps[dateKey];
        entry.friendIds = Array.from(new Set([...entry.friendIds, friend.id]));
        entry.friendNames = Array.from(new Set([...entry.friendNames, friend.name]));
        entry.cities = Array.from(new Set([...entry.cities, ...cities]));
      }
    }
  }

  return {
    month,
    ownSnapshotAvailable: Boolean(ownSnapshot),
    friends,
    overlaps
  };
}
