import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

const prisma = new PrismaClient({
  datasources: databaseUrl
    ? { db: { url: databaseUrl } }
    : undefined,
});

describe("Prisma application status persistence", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.skipIf(!databaseUrl)("persists custom status and interview date", async () => {
    const user = await prisma.user.create({
      data: {
        email: "prisma-test@example.com",
        name: "Prisma Test",
        handle: "prisma-test-" + Date.now(),
      },
    });

    const status = await prisma.applicationStatusDefinition.create({
      data: {
        userId: user.id,
        key: "PHONE_SCREEN",
        label: "Phone Screen",
        category: "SCREENING",
        color: "blue",
        sortOrder: 15,
      },
    });

    const interviewAt = new Date("2026-10-20T17:00:00.000Z");

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        company: "Prisma Test Co",
        role: "Frontend Engineer",
        customStatusId: status.id,
        interviewAt,
      },
      include: { customStatus: true },
    });

    expect(application.customStatus?.label).toBe("Phone Screen");
    expect(application.interviewAt?.toISOString()).toBe(interviewAt.toISOString());

    await prisma.application.delete({ where: { id: application.id } });
    await prisma.applicationStatusDefinition.delete({ where: { id: status.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
