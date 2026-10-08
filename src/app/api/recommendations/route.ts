import { NextResponse } from "next/server";
import { searchJobs, type ExperienceLevel, type JobPlatform } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  if (!settings.searchSuggestionsEnabled) return NextResponse.json({ enabled: false, jobs: [] });

  const searches = await prisma.historyEvent.findMany({
    where: { userId: user.id, type: "SEARCH" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const unique = new Map<string, { query: string; location: string; platform: string; experience: string; remoteOnly: boolean }>();
  for (const event of searches) {
    const query = event.title?.trim();
    if (!query) continue;
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
    const key = [query, metadata.location, metadata.platform, metadata.experience, metadata.remoteOnly].join("|");
    if (!unique.has(key)) {
      unique.set(key, {
        query,
        location: typeof metadata.location === "string" ? metadata.location : "",
        platform: typeof metadata.platform === "string" ? metadata.platform : "all",
        experience: typeof metadata.experience === "string" ? metadata.experience : "all",
        remoteOnly: metadata.remoteOnly === true,
      });
    }
    if (unique.size >= 3) break;
  }

  const results = [];
  for (const search of unique.values()) {
    try {
      const result = await searchJobs({
        query: search.query,
        location: search.location,
        source: "all",
        platform: search.platform as JobPlatform | "all",
        experience: search.experience as ExperienceLevel,
        remoteOnly: search.remoteOnly,
        limit: 8,
      });
      results.push(...result.jobs);
    } catch {
      // One provider failing should not hide recommendations from the other searches.
    }
  }

  const seen = new Set<string>();
  const jobs = results.filter((job) => {
    const key = job.url || job.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 24);

  return NextResponse.json({ enabled: true, jobs });
}
