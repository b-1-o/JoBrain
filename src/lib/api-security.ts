import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest, NextResponse } from "next/server";

let redis: Redis | null | undefined;
const limiters = new Map<string, Ratelimit>();

function getRedis() {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(name: string, requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  const key = name + ":" + requests + ":" + window;
  const existing = limiters.get(key);
  if (existing) return existing;

  const client = getRedis();
  if (!client) return null;

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: "jobrain:ratelimit",
  });

  limiters.set(key, limiter);
  return limiter;
}

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || real || "unknown";
  return ip;
}

export async function enforceRateLimit(
  request: NextRequest,
  name: string,
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1] = "1 m",
) {
  const limiter = getLimiter(name, requests, window);

  if (!limiter) {
    if (process.env.NODE_ENV === "production" && process.env.JOBRAIN_RATE_LIMIT_DISABLED !== "true") {
      return { allowed: false, response: new Response("Rate limiting is not configured", { status: 503 }) };
    }
    return { allowed: true, response: null };
  }

  const result = await limiter.limit(name + ":" + clientKey(request));
  if (result.success) return { allowed: true, response: null };

  return {
    allowed: false,
    response: new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    }),
  };
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: NextRequest, response?: NextResponse) {
  if (sameOrigin(request)) return null;

  return response
    ? new Response("Cross-origin mutation rejected", { status: 403 })
    : new Response("Cross-origin mutation rejected", { status: 403 });
}

export function getRedisClient() {
  return getRedis();
}
