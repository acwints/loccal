import type { DayLocation } from "@/lib/loccal";

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

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  relationshipStatus: "none" | "friends" | "pendingOutgoing" | "pendingIncoming";
  incomingRequestId: string | null;
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
