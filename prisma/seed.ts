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

  const userCount = await prisma.user.count();

  console.warn("Seed completed successfully.");
  console.warn(`Total users in database: ${userCount}`);
  console.warn(`Demo account: ${user.email} (id: ${user.id})`);
  console.warn("Applications: 0 (will be seeded in Stage 2)");
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
