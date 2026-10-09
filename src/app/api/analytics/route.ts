import { NextResponse } from "next/server";
import { buildApplicationAnalytics, parseAnalyticsRange } from "@/lib/analytics";
import { requireAuthUser } from "@/lib/require-auth-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Sign in to view your personal analytics." }, { status: 401 });

    const url = new URL(request.url);
    const range = parseAnalyticsRange(url.searchParams.get("range"));
    const analytics = await buildApplicationAnalytics(user.id, range);
    return NextResponse.json(analytics, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[JoBrain] Failed to build application analytics.", error);
    return NextResponse.json({ error: "Could not load application analytics. Please retry." }, { status: 500 });
  }
}
