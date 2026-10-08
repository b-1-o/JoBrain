import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const booleanKeys = [
    "jobAlertsEnabled",
    "searchSuggestionsEnabled",
    "applicationNotificationsEnabled",
    "emailNotificationsEnabled",
    "historyTrackingEnabled",
    "reducedMotion",
  ] as const;

  const data: Partial<Record<(typeof booleanKeys)[number], boolean>> & { theme?: string } = {};
  for (const key of booleanKeys) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }
  if (typeof body.theme === "string" && ["dark", "light", "system"].includes(body.theme)) {
    data.theme = body.theme;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  return NextResponse.json({ settings });
}
