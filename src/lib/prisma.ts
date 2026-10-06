import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV !== "production";
  const logQueries = isDev || env.LOG_LEVEL === "debug";

  return new PrismaClient({
    log: logQueries
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

/**
 * Singleton PrismaClient — reuses the same instance across HMR in development
 * so we do not exhaust the connection pool.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
