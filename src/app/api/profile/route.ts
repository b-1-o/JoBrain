import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";
import { sanitizeImageUrl } from "@/lib/media";
import { clamp } from "@/lib/appearance";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: user.name },
  });

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if ("displayName" in body) {
    data.displayName =
      typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : null;
  }
  if ("bio" in body) {
    data.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 1200) : null;
  }
  if ("avatarUrl" in body) data.avatarUrl = sanitizeImageUrl(body.avatarUrl);
  if ("bannerUrl" in body) data.bannerUrl = sanitizeImageUrl(body.bannerUrl);
  if ("backgroundUrl" in body) data.backgroundUrl = sanitizeImageUrl(body.backgroundUrl);
  if ("accentColor" in body) {
    data.accentColor =
      typeof body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accentColor)
        ? body.accentColor
        : null;
  }
  if (typeof body.glassIntensity === "number") {
    data.glassIntensity = clamp(Math.round(body.glassIntensity), 0, 80);
  }
  if (typeof body.glassBlur === "number") {
    data.glassBlur = clamp(Math.round(body.glassBlur), 0, 24);
  }
  if (typeof body.panelOpacity === "number") {
    data.panelOpacity = clamp(Math.round(body.panelOpacity), 40, 95);
  }
  if (typeof body.borderIntensity === "number") {
    data.borderIntensity = clamp(Math.round(body.borderIntensity), 0, 100);
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      displayName: user.name,
      ...data,
    },
  });

  return NextResponse.json({ profile });
}
