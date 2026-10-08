import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

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
  const toUrl = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const parsed = new URL(value.trim());
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString().slice(0, 2048) : null;
    } catch {
      return null;
    }
  };

  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : null;
  const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 1200) : null;
  const avatarUrl = toUrl(body.avatarUrl);
  const bannerUrl = toUrl(body.bannerUrl);
  const backgroundUrl = toUrl(body.backgroundUrl);
  const accentColor = typeof body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accentColor)
    ? body.accentColor
    : null;
  const glassIntensity =
    typeof body.glassIntensity === "number"
      ? Math.min(80, Math.max(0, Math.round(body.glassIntensity)))
      : 45;

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { displayName, bio, avatarUrl, bannerUrl, backgroundUrl, accentColor, glassIntensity },
    create: {
      userId: user.id,
      displayName,
      bio,
      avatarUrl,
      bannerUrl,
      backgroundUrl,
      accentColor,
      glassIntensity,
    },
  });

  return NextResponse.json({ profile });
}
