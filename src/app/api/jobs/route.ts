import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureError } from "@/lib/telemetry";
import { enforceRateLimit } from "@/lib/api-security";
import { getCachedJobs, setCachedJobs } from "@/lib/job-cache";
import { searchJobs, type ExperienceLevel, type JobPlatform, type JobSource } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
  query: z.string().trim().max(160).default(""),
  location: z.string().trim().max(160).default(""),
  source: z.enum(["all", "remoteok", "remotive", "jobicy", "adzuna", "googlejobs"]).default("all"),
  platform: z
    .enum([
      "all",
      "linkedin",
      "indeed",
      "glassdoor",
      "ziprecruiter",
      "dice",
      "company",
      "remoteok",
      "remotive",
      "jobicy",
      "adzuna",
      "other",
    ])
    .default("all"),
  experience: z.enum(["all", "intern", "junior", "mid", "senior", "lead"]).default("all"),
  remote: z.enum(["true", "false"]).default("false"),
  limit: z.coerce.number().int().min(10).max(120).default(120),
});

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "jobs-search", 30, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const parsed = searchSchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? "",
    location: request.nextUrl.searchParams.get("location") ?? "",
    source: request.nextUrl.searchParams.get("source") ?? "all",
    platform: request.nextUrl.searchParams.get("platform") ?? "all",
    experience: request.nextUrl.searchParams.get("experience") ?? "all",
    remote: request.nextUrl.searchParams.get("remote") ?? "false",
    limit: request.nextUrl.searchParams.get("limit") ?? "120",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const params = {
    query: parsed.data.query,
    location: parsed.data.location,
    source: parsed.data.source as JobSource | "all",
    platform: parsed.data.platform as JobPlatform | "all",
    experience: parsed.data.experience as ExperienceLevel,
    remoteOnly: parsed.data.remote === "true",
    limit: parsed.data.limit,
  };

  try {
    if (process.env.JOBRAIN_E2E_MODE === "true") {
      return NextResponse.json({
        jobs: [
          {
            id: "e2e:frontend-1",
            source: "googlejobs",
            platform: "company",
            level: "junior",
            title: "Junior Frontend Developer",
            company: "JoBrain Labs",
            location: "Remote",
            remote: true,
            url: "https://example.com/jobs/frontend",
            description: "E2E fixture role for deterministic browser tests.",
            tags: ["React", "TypeScript"],
            salary: "$90,000–$120,000",
            postedAt: new Date().toISOString(),
          },
        ],
        sources: { googlejobs: "ok" },
        fetchedAt: new Date().toISOString(),
      }, {
        headers: { "X-Cache": "E2E" },
      });
    }

    const cached = await getCachedJobs(params);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate",
          "X-Cache": "HIT",
        },
      });
    }

    const result = await searchJobs(params);
    await setCachedJobs(params, result);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-Cache": "MISS",
      },
    });
  } catch {
    captureError(error, { route: "/api/jobs", method: "GET" });
    return NextResponse.json(
      { error: "Job search failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
