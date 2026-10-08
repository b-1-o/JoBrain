ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "clerkId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key"
ON "users"("clerkId");
