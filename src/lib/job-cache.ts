import type { JobSearchParams } from "@/lib/jobs";
import { getRedisClient } from "@/lib/api-security";

const CACHE_TTL_SECONDS = 60;

function cacheKey(params: JobSearchParams) {
  return (
    "jobrain:jobs:" +
    Buffer.from(
      JSON.stringify({
        query: params.query.trim().toLowerCase(),
        location: params.location.trim().toLowerCase(),
        remoteOnly: params.remoteOnly,
        source: params.source,
        platform: params.platform,
        experience: params.experience,
        limit: params.limit,
      }),
    ).toString("base64url")
  );
}

export async function getCachedJobs<T>(params: JobSearchParams) {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.get<T>(cacheKey(params));
}

export async function setCachedJobs<T>(params: JobSearchParams, value: T) {
  const redis = getRedisClient();
  if (!redis) return;

  await redis.set(cacheKey(params), value, { ex: CACHE_TTL_SECONDS });
}
