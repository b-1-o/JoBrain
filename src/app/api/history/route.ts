import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

const types = new Set(["SEARCH", "JOB_OPEN", "EXTERNAL_LINK", "PAGE_VIEW"] as const);

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") ?? "50") || 50));
  const history = await prisma.historyEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const type = typeof body.type === "string" && types.has(body.type as never)
    ? (body.type as "SEARCH" | "JOB_OPEN" | "EXTERNAL_LINK" | "PAGE_VIEW")
    : null;

  if (!type) return NextResponse.json({ error: "Invalid history type." }, { status: 400 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { historyTrackingEnabled: true },
  });
  if (!settings.historyTrackingEnabled) {
    return NextResponse.json({ event: null, tracked: false });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 240) : null;
  const targetUrl = typeof body.url === "string" ? body.url.trim().slice(0, 2048) : null;
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 160) : null;
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  const event = await prisma.historyEvent.create({
    data: { userId: user.id, type, title, url: targetUrl, company, metadata },
  });

  return NextResponse.json({ event }, { status: 201 });
}
