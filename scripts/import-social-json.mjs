#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient, SocialFollowRequestStatus, SocialShareMode } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const input = process.argv[2]?.trim();
  if (!input) {
    return path.join(process.cwd(), "data", "loccal-social.json");
  }
  return path.isAbsolute(input) ? input : path.join(process.cwd(), input);
}

function toRequestStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "APPROVED") return SocialFollowRequestStatus.APPROVED;
  if (normalized === "DENIED") return SocialFollowRequestStatus.DENIED;
  return SocialFollowRequestStatus.PENDING;
}

function normalizeDays(input) {
  return input && typeof input === "object" ? input : {};
}

async function main() {
  const filePath = parseArgs();
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  const users = Array.isArray(parsed.users) ? parsed.users : [];
  const followRequests = Array.isArray(parsed.followRequests) ? parsed.followRequests : [];
  const follows = Array.isArray(parsed.follows) ? parsed.follows : [];
  const snapshots = Array.isArray(parsed.monthlySnapshots) ? parsed.monthlySnapshots : [];

  for (const user of users) {
    if (!user?.id || !user?.email || !user?.name) continue;
    await prisma.socialUser.upsert({
      where: { id: String(user.id) },
      create: {
        id: String(user.id),
        email: String(user.email),
        name: String(user.name),
        avatarUrl: user.avatarUrl ? String(user.avatarUrl) : null,
        shareMode: SocialShareMode.FRIENDS
      },
      update: {
        email: String(user.email),
        name: String(user.name),
        avatarUrl: user.avatarUrl ? String(user.avatarUrl) : null
      }
    });
  }

  for (const req of followRequests) {
    if (!req?.requesterId || !req?.targetId) continue;
    await prisma.socialFollowRequest.upsert({
      where: {
        requesterId_targetId: {
          requesterId: String(req.requesterId),
          targetId: String(req.targetId)
        }
      },
      create: {
        requesterId: String(req.requesterId),
        targetId: String(req.targetId),
        status: toRequestStatus(req.status)
      },
      update: {
        status: toRequestStatus(req.status)
      }
    });
  }

  if (follows.length > 0) {
    await prisma.socialFollow.createMany({
      data: follows
        .filter((follow) => follow?.followerId && follow?.followeeId)
        .map((follow) => ({
          followerId: String(follow.followerId),
          followeeId: String(follow.followeeId)
        })),
      skipDuplicates: true
    });
  }

  for (const snapshot of snapshots) {
    if (!snapshot?.userId || !snapshot?.month || !snapshot?.timeZone || !snapshot?.generatedAt) {
      continue;
    }

    const generatedAt = new Date(String(snapshot.generatedAt));
    if (Number.isNaN(generatedAt.getTime())) continue;

    await prisma.socialMonthlySnapshot.upsert({
      where: {
        userId_month: {
          userId: String(snapshot.userId),
          month: String(snapshot.month)
        }
      },
      create: {
        userId: String(snapshot.userId),
        month: String(snapshot.month),
        timeZone: String(snapshot.timeZone),
        generatedAt,
        days: normalizeDays(snapshot.days)
      },
      update: {
        timeZone: String(snapshot.timeZone),
        generatedAt,
        days: normalizeDays(snapshot.days)
      }
    });
  }

  console.log(
    `Imported ${users.length} users, ${followRequests.length} requests, ${follows.length} follows, ${snapshots.length} snapshots from ${filePath}`
  );
}

main()
  .catch((error) => {
    console.error("Failed to import social JSON data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
