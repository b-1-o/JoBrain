ALTER TABLE "users" ADD COLUMN "clerkId" TEXT;
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");
