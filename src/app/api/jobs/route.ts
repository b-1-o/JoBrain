import { NextResponse, type NextRequest } from "next/server";
import { searchJobs, type JobSource } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sourceParam = params.get("source") ?? "all";
  const allowed = ["all", "remoteok", "remotive", "arbeitnow", "hh"];

  if (!allowed.includes(sourceParam)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const result = await searchJobs({
      query: params.get("query") ?? "",
      location: params.get("location") ?? "",
      source: sourceParam as JobSource | "all",
      remoteOnly: params.get("remote") !== "false",
      limit: Number(params.get("limit") ?? 72),
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