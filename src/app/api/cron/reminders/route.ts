import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api-security";
import { runReminderWorker } from "@/lib/reminders";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-jobrain-cron-secret") === secret;
}

async function handler(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, "cron-reminders", 10, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const result = await runReminderWorker({ dryRun });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Reminder worker failed" },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
