import { NextResponse, type NextRequest } from "next/server";
import { searchJobs, type ExperienceLevel, type JobPlatform, type JobSource } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sourceParam = params.get("source") ?? "all";
  const platformParam = params.get("platform") ?? "all";
  const experienceParam = params.get("experience") ?? "all";

  const allowedSources = [
    "all",
    "remoteok",
    "remotive",
    "jobicy",
    "adzuna",
    "googlejobs",
  ];

  const allowedPlatforms = [
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
  ];

  const allowedExperience = [
    "all",
    "intern",
    "junior",
    "mid",
    "senior",
    "lead",
  ];

  if (!allowedSources.includes(sourceParam)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  if (!allowedPlatforms.includes(platformParam)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (!allowedExperience.includes(experienceParam)) {
    return NextResponse.json({ error: "Invalid experience level" }, { status: 400 });
  }

  try {
    const requestedLimit = Number(params.get("limit") ?? 36);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(48, Math.max(1, Math.round(requestedLimit)))
      : 36;

    const result = await searchJobs({
      query: params.get("query") ?? "",
      location: params.get("location") ?? "",
      source: sourceParam as JobSource | "all",
      platform: platformParam as JobPlatform | "all",
      experience: experienceParam as ExperienceLevel,
      remoteOnly: params.get("remote") === "true",
      limit,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      { error: "Job search failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
