-- CreateEnum
CREATE TYPE "public"."HabitCategory" AS ENUM ('body', 'mind', 'work', 'social', 'creative', 'home', 'other');

-- CreateEnum
CREATE TYPE "public"."SettlementLevel" AS ENUM ('city', 'state', 'country', 'continent', 'world');

-- CreateEnum
CREATE TYPE "public"."BuildingStatus" AS ENUM ('healthy', 'decaying', 'ruined');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "timezoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "lastProcessedOn" DATE,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."HabitCategory" NOT NULL DEFAULT 'other',
    "frequency" INTEGER NOT NULL DEFAULT 127,
    "createdOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "archivedOn" DATE,
    "consecutiveMisses" INTEGER NOT NULL DEFAULT 0,
    "lastMissedOn" DATE,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Completion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "completedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "public"."SettlementLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "foundedOn" DATE NOT NULL,
    "gridSize" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "tileX" INTEGER,
    "tileY" INTEGER,
    "buildingCount" INTEGER NOT NULL DEFAULT 0,
    "healthyCount" INTEGER NOT NULL DEFAULT 0,
    "decayingCount" INTEGER NOT NULL DEFAULT 0,
    "ruinedCount" INTEGER NOT NULL DEFAULT 0,
    "childCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Building" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "habitId" TEXT,
    "completionId" TEXT,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "builtOn" DATE NOT NULL,
    "condition" INTEGER NOT NULL DEFAULT 100,
    "lastMaintainedOn" DATE NOT NULL,
    "status" "public"."BuildingStatus" NOT NULL DEFAULT 'healthy',

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Milestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT,
    "type" TEXT NOT NULL,
    "streakStartedOn" DATE,
    "unlockedOn" DATE NOT NULL,
    "buildingId" TEXT,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Habit_userId_archivedAt_idx" ON "public"."Habit"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_habitId_completedOn_key" ON "public"."Completion"("habitId", "completedOn");

-- CreateIndex
CREATE INDEX "Settlement_userId_level_idx" ON "public"."Settlement"("userId", "level");

-- CreateIndex
CREATE INDEX "Settlement_parentId_idx" ON "public"."Settlement"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_completionId_key" ON "public"."Building"("completionId");

-- CreateIndex
CREATE INDEX "Building_habitId_idx" ON "public"."Building"("habitId");

-- CreateIndex
CREATE INDEX "Building_settlementId_status_idx" ON "public"."Building"("settlementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Building_settlementId_gridX_gridY_key" ON "public"."Building"("settlementId", "gridX", "gridY");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_buildingId_key" ON "public"."Milestone"("buildingId");

-- CreateIndex
CREATE INDEX "Milestone_userId_idx" ON "public"."Milestone"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_habitId_type_streakStartedOn_key" ON "public"."Milestone"("habitId", "type", "streakStartedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Completion" ADD CONSTRAINT "Completion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Building" ADD CONSTRAINT "Building_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Building" ADD CONSTRAINT "Building_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Building" ADD CONSTRAINT "Building_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "public"."Completion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "public"."Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
