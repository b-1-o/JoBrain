import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/require-auth-user";
import { prisma } from "@/lib/prisma";

const sourceEnum = z.enum([
  "HH",
  "LINKEDIN",
  "UPWORK",
  "REFERRAL",
  "REMOTIVE",
  "REMOTEOK",
  "TELEGRAM",
  "INDEED",
  "COMPANY_SITE",
  "OTHER",
]);

const statusEnum = z.enum([
  "FOUND",
  "APPLIED",
  "SCREENING",
  "TECH",
  "OFFER",
  "REJECTED",
]);

const createSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  url: z.string().url().max(2048).optional(),
  source: sourceEnum.optional(),
  status: statusEnum.optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(10000).optional(),
  appliedAt: z.string().datetime().optional(),
  nextActionAt: z.string().datetime().optional(),
});

const patchSchema = createSchema.partial().extend({
  id: z.string().min(1),
});

async function createApplicationNotification(
  userId: string,
  type: "APPLICATION_CREATED" | "APPLICATION_UPDATED",
  title: string,
  body: string,
  url?: string | null,
) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (!settings.applicationNotificationsEnabled) return;
  await prisma.notification.create({
    data: { userId, type, title, body, url: url ?? null },
  });
}

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in to access your application pipeline." }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ applications }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in to save jobs to your pipeline." }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        company: body.company,
        role: body.role,
        url: body.url,
        source: body.source,
        status: body.status,
        salaryMin: body.salaryMin,
        salaryMax: body.salaryMax,
        currency: body.currency,
        notes: body.notes,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
        nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
      },
    });

    await createApplicationNotification(
      user.id,
      "APPLICATION_CREATED",
      "Role added to pipeline",
      `${application.company} · ${application.role} is now tracked in JoBrain.`,
      "/?tab=pipeline",
    );

    return NextResponse.json({ application }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your pipeline." }, { status: 401 });

  try {
    const body = patchSchema.parse(await request.json());

    const { id } = body;
    const existing = await prisma.application.findFirst({
      where: { id, userId: user.id },
      select: { company: true, role: true, status: true },
    });
    const result = await prisma.application.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.salaryMin !== undefined ? { salaryMin: body.salaryMin } : {}),
        ...(body.salaryMax !== undefined ? { salaryMax: body.salaryMax } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.appliedAt !== undefined
          ? { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }
          : {}),
        ...(body.nextActionAt !== undefined
          ? { nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null }
          : {}),
      },
    });

    if (result.count === 1 && existing && body.status && body.status !== existing.status) {
      await createApplicationNotification(
        user.id,
        "APPLICATION_UPDATED",
        "Application status updated",
        `${existing.company} · ${existing.role} moved from ${existing.status} to ${body.status}.`,
        "/?tab=pipeline",
      );
    }

    return NextResponse.json({ updated: result.count === 1 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete saved applications." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.application.deleteMany({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}