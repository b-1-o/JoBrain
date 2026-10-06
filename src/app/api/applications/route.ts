import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/current-user";
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

function setWorkspaceCookie(response: NextResponse, userId: string) {
  response.cookies.set("jobrain_workspace", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

function sanitize(data: z.infer<typeof createSchema>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

export async function GET(request: NextRequest) {
  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const response = NextResponse.json({ applications });
  setWorkspaceCookie(response, user.id);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const { user } = await getWorkspaceUser(
      request.cookies.get("jobrain_workspace")?.value,
    );

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

    const response = NextResponse.json({ application }, { status: 201 });
    setWorkspaceCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = patchSchema.parse(await request.json());
    const { user } = await getWorkspaceUser(
      request.cookies.get("jobrain_workspace")?.value,
    );

    const { id } = body;
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

    const response = NextResponse.json({ updated: result.count === 1 });
    setWorkspaceCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  await prisma.application.deleteMany({
    where: { id, userId: user.id },
  });

  const response = NextResponse.json({ ok: true });
  setWorkspaceCookie(response, user.id);
  return response;
}