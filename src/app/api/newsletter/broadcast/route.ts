import { NextRequest, NextResponse } from "next/server";
import { sendNewsletter } from "@/lib/newsletter";

function isAuthorized(request: NextRequest) {
  const secret = process.env.NEWSLETTER_ADMIN_SECRET;
  return Boolean(secret && request.headers.get("authorization") === "Bearer " + secret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { subject?: string; text?: string } | null;
  if (!body?.subject?.trim() || !body.text?.trim()) {
    return NextResponse.json({ error: "subject and text are required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await sendNewsletter(body.subject.trim(), body.text.trim()));
  } catch {
    return NextResponse.json({ error: "Newsletter delivery failed" }, { status: 503 });
  }
}
