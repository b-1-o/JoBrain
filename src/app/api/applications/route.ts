import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureError } from "@/lib/telemetry";
import { captureError } from "@/lib/telemetry";
import { enforceRateLimit, sameOrigin } from "@/lib/api-security";
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

const isoDate = z.string().datetime({ offset: true });

const createSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  url: z.string().url().max(2048).optional(),
  source: sourceEnum.optional(),
  status: statusEnum.optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  notes: z.string().max(10000).optional(),
  contactName: z.string().trim().max(200).optional(),
  contactEmail: z.string().email().max(320).optional(),
  appliedAt: isoDate.optional(),
  nextActionAt: isoDate.optional(),
  lastContactAt: isoDate.optional(),
  interviewAt: isoDate.optional(),
  customStatusId: z.string().min(1).max(128).nullable().optional(),
});

const patchSchema = createSchema.partial().extend({
  id: z.string().min(1).max(128),
});

const deleteSchema = z.object({
  id: z.string().min(1).max(128),
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

function rejectMutation(request: NextRequest) {
  return sameOrigin(request)
    ? null
    : NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "applications-read", 120, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { customStatus: true },
    orderBy: { updatedAt: "desc" },
  });

  const response = NextResponse.json({ applications });
  setWorkspaceCookie(response, user.id);
  return response;
}

export async function POST(request: NextRequest) {
  const forbidden = rejectMutation(request);
  if (forbidden) return forbidden;

  const limited = await enforceRateLimit(request, "applications-write", 60, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  try {
    const body = createSchema.parse(await request.json());
    const { user } = await getWorkspaceUser(
      request.cookies.get("jobrain_workspace")?.value,
    );

    if (body.customStatusId) {
      const definition = await prisma.applicationStatusDefinition.findFirst({
        where: {
          id: body.customStatusId,
          OR: [{ userId: null, isSystem: true }, { userId: user.id }],
        },
      });
      if (!definition) return NextResponse.json({ error: "Invalid custom status" }, { status: 400 });
    }

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
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
        nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
        lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : undefined,
        interviewAt: body.interviewAt ? new Date(body.interviewAt) : undefined,
        customStatusId: body.customStatusId ?? undefined,
      },
    });

    const response = NextResponse.json({ application }, { status: 201 });
    setWorkspaceCookie(response, user.id);
    return response;
  } catch (error) {
    captureError(error, { route: "/api/applications", method: "POST" });
    return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const forbidden = rejectMutation(request);
  if (forbidden) return forbidden;

  const limited = await enforceRateLimit(request, "applications-write", 60, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  try {
    const body = patchSchema.parse(await request.json());
    const { user } = await getWorkspaceUser(
      request.cookies.get("jobrain_workspace")?.value,
    );

    const { id } = body;
    if (body.customStatusId) {
      const definition = await prisma.applicationStatusDefinition.findFirst({
        where: {
          id: body.customStatusId,
          OR: [{ userId: null, isSystem: true }, { userId: user.id }],
        },
      });
      if (!definition) return NextResponse.json({ error: "Invalid custom status" }, { status: 400 });
    }
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
        ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail } : {}),
        ...(body.appliedAt !== undefined
          ? { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }
          : {}),
        ...(body.nextActionAt !== undefined
          ? { nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null }
          : {}),
        ...(body.lastContactAt !== undefined
          ? { lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : null }
          : {}),
        ...(body.interviewAt !== undefined
          ? { interviewAt: body.interviewAt ? new Date(body.interviewAt) : null }
          : {}),
        ...(body.customStatusId !== undefined
          ? { customStatusId: body.customStatusId }
          : {}),
      },
    });

    const response = NextResponse.json({ updated: result.count === 1 });
    setWorkspaceCookie(response, user.id);
    return response;
  } catch (error) {
    captureError(error, { route: "/api/applications", method: "PATCH" });
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const forbidden = rejectMutation(request);
  if (forbidden) return forbidden;

  const limited = await enforceRateLimit(request, "applications-write", 60, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const parsed = deleteSchema.safeParse({
    id: request.nextUrl.searchParams.get("id") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  await prisma.application.deleteMany({
    where: { id: parsed.data.id, userId: user.id },
  });

  const response = NextResponse.json({ ok: true });
  setWorkspaceCookie(response, user.id);
  return response;
}
