import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";
import { sanitizeImageUrl } from "@/lib/media";
import { clamp } from "@/lib/appearance";

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: user.name },
    });

    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[JoBrain] Failed to load user profile.", error);
    return NextResponse.json(
      { error: "Your profile could not be loaded. Please retry. If the issue continues, the database connection may be unavailable." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if ("displayName" in body) {
      data.displayName =
        typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : null;
    }
    if ("bio" in body) {
      data.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 1200) : null;
    }
    for (const field of ["avatarUrl", "bannerUrl", "backgroundUrl"] as const) {
      if (!(field in body)) continue;
      const raw = body[field];
      const safe = sanitizeImageUrl(raw);
      if (typeof raw === "string" && raw.trim() && !safe) {
        return NextResponse.json(
          { error: "Enter a valid public HTTP(S) image URL or clear the field before saving." },
          { status: 400 },
        );
      }
      data[field] = safe;
    }
    if ("accentColor" in body) {
      if (typeof body.accentColor === "string" && !/^#[0-9a-fA-F]{6}$/.test(body.accentColor)) {
        return NextResponse.json({ error: "Choose a valid accent color." }, { status: 400 });
      }
      data.accentColor = typeof body.accentColor === "string" ? body.accentColor : null;
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid profile fields were provided." }, { status: 400 });
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, displayName: user.name, ...data },
    });

    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[JoBrain] Failed to save user profile.", error);
    return NextResponse.json(
      { error: "Your profile was not saved. Please retry. If the issue continues, the database connection may be unavailable." },
      { status: 500 },
    );
  }
}
