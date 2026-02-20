import { Prisma, SocialShareMode as PrismaSocialShareMode } from "@prisma/client";

import type { DayLocation } from "@/lib/loccal";
import { prisma } from "@/lib/prisma";

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  shareMode: SocialShareMode;
  lastSharedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SocialShareMode = "friends" | "private";

export interface MonthlySnapshot {
  id: string;
  userId: string;
  month: string;
  timeZone: string;
  generatedAt: string;
  days: Record<string, DayLocation[]>;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSocialUserInput {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

function fromPrismaShareMode(mode: PrismaSocialShareMode): SocialShareMode {
  return mode === PrismaSocialShareMode.PRIVATE ? "private" : "friends";
}

function toPrismaShareMode(mode: SocialShareMode): PrismaSocialShareMode {
  return mode === "private" ? PrismaSocialShareMode.PRIVATE : PrismaSocialShareMode.FRIENDS;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceInferredEvent(input: unknown) {
  if (!isObject(input)) return null;
  const title = typeof input.title === "string" ? input.title : null;
  const isAllDay = typeof input.isAllDay === "boolean" ? input.isAllDay : null;
  const startIso = typeof input.startIso === "string" ? input.startIso : null;
  const endIso = typeof input.endIso === "string" ? input.endIso : null;
  const inferredFrom = typeof input.inferredFrom === "string" ? input.inferredFrom : null;
  const mapsUrl = typeof input.mapsUrl === "string" ? input.mapsUrl : null;

  if (!title || isAllDay === null || !startIso || !endIso || !inferredFrom || !mapsUrl) {
    return null;
  }

  return {
    title,
    isAllDay,
    startIso,
    endIso,
    inferredFrom,
    mapsUrl
  };
}

export function coerceDayLocationRecord(input: unknown): Record<string, DayLocation[]> {
  if (!isObject(input)) return {};

  const result: Record<string, DayLocation[]> = {};
  const entries = Object.entries(input);

  for (const [dateKey, value] of entries) {
    if (!Array.isArray(value)) continue;
    const dayEntries: DayLocation[] = [];

    for (const candidate of value) {
      if (!isObject(candidate)) continue;
      const location = typeof candidate.location === "string" ? candidate.location : null;
      const eventsRaw = Array.isArray(candidate.events) ? candidate.events : [];
      if (!location) continue;

      const events = eventsRaw
        .map((eventCandidate) => coerceInferredEvent(eventCandidate))
        .filter((entry): entry is NonNullable<ReturnType<typeof coerceInferredEvent>> => Boolean(entry));

      dayEntries.push({ location, events });
    }

    result[dateKey] = dayEntries;
  }

  return result;
}

function toDbJson(value: Record<string, DayLocation[]>) {
  return value as unknown as Prisma.InputJsonValue;
}

export async function upsertSocialUser(input: UpsertSocialUserInput) {
  const user = await prisma.$transaction(async (tx) => {
    const existingByEmail = await tx.socialUser.findUnique({
      where: { email: input.email },
      select: { id: true }
    });

    // Keep Google-sub id aligned with the canonical email row when accounts are re-linked.
    if (existingByEmail && existingByEmail.id !== input.id) {
      await tx.socialUser.update({
        where: { id: existingByEmail.id },
        data: {
          id: input.id,
          name: input.name,
          avatarUrl: input.avatarUrl ?? null
        }
      });
    }

    return tx.socialUser.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null
      },
      update: {
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null
      }
    });
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    shareMode: fromPrismaShareMode(user.shareMode),
    lastSharedAt: toIso(user.lastSharedAt),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  } satisfies SocialUser;
}

export async function saveMonthlySnapshot(input: {
  userId: string;
  month: string;
  timeZone: string;
  generatedAt: string;
  days: Record<string, DayLocation[]>;
}) {
  const generatedAt = new Date(input.generatedAt);

  const [snapshot] = await prisma.$transaction([
    prisma.socialMonthlySnapshot.upsert({
      where: {
        userId_month: {
          userId: input.userId,
          month: input.month
        }
      },
      create: {
        userId: input.userId,
        month: input.month,
        timeZone: input.timeZone,
        generatedAt,
        days: toDbJson(input.days)
      },
      update: {
        timeZone: input.timeZone,
        generatedAt,
        days: toDbJson(input.days)
      }
    }),
    prisma.socialUser.update({
      where: { id: input.userId },
      data: { lastSharedAt: generatedAt },
      select: { id: true }
    })
  ]);

  return {
    id: snapshot.id,
    userId: snapshot.userId,
    month: snapshot.month,
    timeZone: snapshot.timeZone,
    generatedAt: snapshot.generatedAt.toISOString(),
    days: coerceDayLocationRecord(snapshot.days),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString()
  } satisfies MonthlySnapshot;
}

export async function getSocialUserPreferences(userId: string) {
  const user = await prisma.socialUser.findUnique({
    where: { id: userId },
    select: {
      shareMode: true,
      lastSharedAt: true
    }
  });

  if (!user) return null;

  return {
    shareMode: fromPrismaShareMode(user.shareMode),
    lastSharedAt: toIso(user.lastSharedAt)
  };
}

export async function updateSocialUserPreferences(input: {
  userId: string;
  shareMode: SocialShareMode;
}) {
  const user = await prisma.socialUser.update({
    where: { id: input.userId },
    data: {
      shareMode: toPrismaShareMode(input.shareMode)
    },
    select: {
      shareMode: true,
      lastSharedAt: true
    }
  });

  return {
    shareMode: fromPrismaShareMode(user.shareMode),
    lastSharedAt: toIso(user.lastSharedAt)
  };
}
