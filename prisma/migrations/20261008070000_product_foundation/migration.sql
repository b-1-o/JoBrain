CREATE TABLE "user_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "bannerUrl" TEXT,
  "backgroundUrl" TEXT,
  "accentColor" VARCHAR(7),
  "glassIntensity" INTEGER NOT NULL DEFAULT 45,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

CREATE TABLE "user_settings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "searchSuggestionsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "applicationNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "historyTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "theme" TEXT NOT NULL DEFAULT 'dark',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

CREATE TYPE "HistoryEventType" AS ENUM ('SEARCH', 'JOB_OPEN', 'EXTERNAL_LINK', 'PAGE_VIEW');

CREATE TABLE "history_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "HistoryEventType" NOT NULL,
  "title" TEXT,
  "url" VARCHAR(2048),
  "company" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "history_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "history_events_userId_createdAt_idx" ON "history_events"("userId", "createdAt");
CREATE INDEX "history_events_userId_type_idx" ON "history_events"("userId", "type");

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "repositoryUrl" VARCHAR(2048) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "liveUrl" VARCHAR(2048),
  "languages" JSONB,
  "technologies" JSONB,
  "readme" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projects_userId_repositoryUrl_key" ON "projects"("userId", "repositoryUrl");
CREATE INDEX "projects_userId_updatedAt_idx" ON "projects"("userId", "updatedAt");

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_settings"
  ADD CONSTRAINT "user_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "history_events"
  ADD CONSTRAINT "history_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
