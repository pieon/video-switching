-- CreateEnum
CREATE TYPE "UserCondition" AS ENUM ('switching', 'non_switching');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('play', 'pause', 'switch', 'complete');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "condition" "UserCondition" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "mode" "UserCondition" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" DOUBLE PRECISION,
    "fromVideoId" TEXT,
    "toVideoId" TEXT,
    "playbackPosition" DOUBLE PRECISION,

    CONSTRAINT "video_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_participantId_key" ON "users"("participantId");

-- AddForeignKey
ALTER TABLE "video_sessions" ADD CONSTRAINT "video_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "video_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
