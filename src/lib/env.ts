import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed environment variables.
 * Import only on the server (or via NEXT_PUBLIC_* on the client).
 * Do not import this file from next.config.* — it runs outside the Next runtime.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // Optional direct (non-pooled) URL for Neon migrations / introspection
    DIRECT_URL: z.string().url().optional(),

    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    EMAIL_SERVER: z.string().optional(),
    EMAIL_FROM: z.string().optional(),

    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info"),

    ADZUNA_APP_ID: z.string().optional(),
    ADZUNA_APP_KEY: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * Next.js inlines NEXT_PUBLIC_* at build time — must list them explicitly.
   * Server vars are read from process.env at runtime.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    EMAIL_SERVER: process.env.EMAIL_SERVER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  emptyStringAsUndefined: true,
  // CI / Docker may set this to skip validation when env is not fully available
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});

export type Env = typeof env;
