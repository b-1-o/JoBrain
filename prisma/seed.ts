import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the values before running the seed.",
    );
  }

  const demoEmail = "demo@jobrain.app";

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    // do not overwrite user modifications on re-seed
    update: {},
    create: {
      email: demoEmail,
      name: "Demo User",
      handle: "demo-user",
      timezone: "UTC",
    },
  });

  const defaultStatuses = [
    ["FOUND", "Found", "neutral", 0],
    ["APPLIED", "Applied", "blue", 10],
    ["SCREENING", "Screening", "violet", 20],
    ["TECH", "Technical", "amber", 30],
    ["OFFER", "Offer", "green", 40],
    ["REJECTED", "Rejected", "red", 50],
  ] as const;

  for (const [key, label, color, sortOrder] of defaultStatuses) {
    await prisma.applicationStatusDefinition.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: { label, color, sortOrder, category: key, isSystem: true },
      create: {
        userId: user.id,
        key,
        label,
        color,
        sortOrder,
        category: key,
        isSystem: true,
      },
    });
  }

  const userCount = await prisma.user.count();

  console.warn("Seed completed successfully.");
  console.warn(`Total users in database: ${userCount}`);
  console.warn(`Demo account: ${user.email} (id: ${user.id})`);
  console.warn("Applications: 0 (will be seeded in Stage 2)");
  console.warn("Default application statuses: 6");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
