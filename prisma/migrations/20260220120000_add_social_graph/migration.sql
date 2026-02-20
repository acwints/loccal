-- CreateEnum
CREATE TYPE "SocialShareMode" AS ENUM ('FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SocialFollowRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "social_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "share_mode" "SocialShareMode" NOT NULL DEFAULT 'FRIENDS',
    "last_shared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_follow_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "SocialFollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_follow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_monthly_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "days" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_users_email_key" ON "social_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "social_follow_requests_requester_id_target_id_key" ON "social_follow_requests"("requester_id", "target_id");

-- CreateIndex
CREATE INDEX "social_follow_requests_target_id_status_created_at_idx" ON "social_follow_requests"("target_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "social_follow_requests_requester_id_status_created_at_idx" ON "social_follow_requests"("requester_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_follows_follower_id_followee_id_key" ON "social_follows"("follower_id", "followee_id");

-- CreateIndex
CREATE INDEX "social_follows_followee_id_follower_id_idx" ON "social_follows"("followee_id", "follower_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_monthly_snapshots_user_id_month_key" ON "social_monthly_snapshots"("user_id", "month");

-- CreateIndex
CREATE INDEX "social_monthly_snapshots_month_generated_at_idx" ON "social_monthly_snapshots"("month", "generated_at");

-- CreateIndex
CREATE INDEX "social_monthly_snapshots_user_id_generated_at_idx" ON "social_monthly_snapshots"("user_id", "generated_at");

-- AddForeignKey
ALTER TABLE "social_follow_requests" ADD CONSTRAINT "social_follow_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "social_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_follow_requests" ADD CONSTRAINT "social_follow_requests_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "social_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_follows" ADD CONSTRAINT "social_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "social_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_follows" ADD CONSTRAINT "social_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "social_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_monthly_snapshots" ADD CONSTRAINT "social_monthly_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "social_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
