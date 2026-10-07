import { NextResponse, type NextRequest } from "next/server";
import { runReminderWorker } from "@/lib/reminders";
import { captureError } from "@/lib/telemetry";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === "Bearer " + secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      await runReminderWorker({
        dryRun: request.nextUrl.searchParams.get("dryRun") === "1",
      }),
    );
  } catch (error) {
    captureError(error, { route: "/api/reminders", method: request.method });
    return NextResponse.json({ error: "Reminder worker failed" }, { status: 503 });
  }
}

export { POST as GET };
