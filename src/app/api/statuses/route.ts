import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit, sameOrigin } from "@/lib/api-security";
import { getWorkspaceUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const categorySchema = z.enum(["FOUND", "APPLIED", "SCREENING", "TECH", "OFFER", "REJECTED"]);
const createSchema = z.object({
  label: z.string().trim().min(1).max(100),
  category: categorySchema.default("FOUND"),
  color: z.string().trim().min(1).max(32).default("neutral"),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

function slugify(value: string) {
  const slug = value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
  return slug || "CUSTOM";
}

function uniqueKey(label: string, existing: Set<string>) {
  const base = slugify(label);
  let key = base;
  let index = 2;
  while (existing.has(key)) {
    key = base + "_" + index;
    index += 1;
  }
  return key;
}

function setWorkspaceCookie(response: NextResponse, userId: string) {
  response.cookies.set("jobrain_workspace", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "statuses-read", 120, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const { user } = await getWorkspaceUser(request.cookies.get("jobrain_workspace")?.value);
  const statuses = await prisma.applicationStatusDefinition.findMany({
    where: { OR: [{ userId: null, isSystem: true }, { userId: user.id }] },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const response = NextResponse.json({ statuses });
  setWorkspaceCookie(response, user.id);
  return response;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const limited = await enforceRateLimit(request, "statuses-write", 30, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  try {
    const body = createSchema.parse(await request.json());
    const { user } = await getWorkspaceUser(request.cookies.get("jobrain_workspace")?.value);
    const existing = await prisma.applicationStatusDefinition.findMany({
      where: { OR: [{ userId: null, isSystem: true }, { userId: user.id }] },
      select: { key: true, sortOrder: true },
    });
    const key = uniqueKey(body.label, new Set(existing.map((status) => status.key)));
    const sortOrder = body.sortOrder ?? (existing.length ? Math.max(...existing.map((status) => status.sortOrder)) + 10 : 0);
    const status = await prisma.applicationStatusDefinition.create({
      data: { userId: user.id, key, label: body.label, category: body.category, color: body.color, sortOrder, isSystem: false },
    });
    const response = NextResponse.json({ status }, { status: 201 });
    setWorkspaceCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid status payload" }, { status: 400 });
  }
}