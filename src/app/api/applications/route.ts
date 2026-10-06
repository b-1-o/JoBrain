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

    const data = sanitize(body);
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        ...data,
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

    const { id, ...raw } = body;
    const data = Object.fromEntries(
      Object.entries(raw)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          key === "appliedAt" || key === "nextActionAt"
            ? value
              ? new Date(value as string)
              : null
            : value,
        ]),
    );

    const result = await prisma.application.updateMany({
      where: { id, userId: user.id },
      data,
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