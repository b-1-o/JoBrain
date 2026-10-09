CREATE TABLE "github_connections" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "githubUserId" TEXT NOT NULL,
  "login" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "github_connections_userId_key" ON "github_connections"("userId");
CREATE UNIQUE INDEX "github_connections_githubUserId_key" ON "github_connections"("githubUserId");

ALTER TABLE "github_connections"
  ADD CONSTRAINT "github_connections_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
