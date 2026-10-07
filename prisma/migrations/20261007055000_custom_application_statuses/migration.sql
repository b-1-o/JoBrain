-- AlterTable
ALTER TABLE "applications" ADD COLUMN "customStatusId" TEXT,
ADD COLUMN "interviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "application_status_definitions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "category" "ApplicationStatus" NOT NULL DEFAULT 'FOUND',
    "color" VARCHAR(32) NOT NULL DEFAULT 'neutral',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_status_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_status_definitions_userId_sortOrder_idx" ON "application_status_definitions"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "application_status_definitions_userId_key_key" ON "application_status_definitions"("userId", "key");

-- CreateIndex
CREATE INDEX "applications_userId_interviewAt_idx" ON "applications"("userId", "interviewAt");

-- CreateIndex
CREATE INDEX "applications_userId_customStatusId_idx" ON "applications"("userId", "customStatusId");

-- AddForeignKey
ALTER TABLE "application_status_definitions" ADD CONSTRAINT "application_status_definitions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "application_status_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
