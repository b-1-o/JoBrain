import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit, sameOrigin } from "@/lib/api-security";
import { getWorkspaceUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const demo = [
  ["Vercel", "Frontend Engineer", "APPLIED", "REMOTEOK"],
  ["Linear", "Product Engineer", "SCREENING", "REMOTIVE"],
  ["Stripe", "Software Engineer, Web", "TECH", "COMPANY_SITE"],
  ["Figma", "Frontend Engineer", "REJECTED", "LINKEDIN"],
  ["Cloudflare", "UI Engineer", "APPLIED", "REMOTEOK"],
  ["Notion", "Frontend Engineer", "OFFER", "REMOTIVE"],
  ["GitHub", "Junior Frontend Developer", "FOUND", "COMPANY_SITE"],
  ["Ramp", "Web Engineer", "APPLIED", "REMOTIVE"],
  ["Supabase", "Frontend Developer", "SCREENING", "REMOTEOK"],
] as const;

const demoSchema = z.object({
  reset: z.boolean().optional().default(false),
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

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const limited = await enforceRateLimit(request, "demo-write", 10, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const contentType = request.headers.get("content-type") ?? "";
  let input: unknown = {};
  if (contentType.includes("application/json")) {
    try {
      input = await request.json();
    } catch {
      input = {};
    }
  }

  const parsed = demoSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo payload" }, { status: 400 });
  }

  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  if (parsed.data.reset) {
    await prisma.application.deleteMany({ where: { userId: user.id } });
  }

  const existing = await prisma.application.count({
    where: { userId: user.id },
  });

  if (existing > 0) {
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    const response = NextResponse.json({ applications, reused: true });
    setWorkspaceCookie(response, user.id);
    return response;
  }

  const created = await prisma.$transaction(
    demo.map(([company, role, status, source], index) =>
      prisma.application.create({
        data: {
          userId: user.id,
          company,
          role,
          status,
          source,
          url: "https://example.com/jobs",
          appliedAt:
            status === "FOUND" ? null : new Date(Date.now() - (index + 1) * 86400000),
          nextActionAt:
            ["APPLIED", "SCREENING", "TECH"].includes(status)
              ? new Date(Date.now() + (index + 1) * 86400000)
              : null,
          notes:
            status === "OFFER"
              ? "Strong product fit. Prepare negotiation notes."
              : undefined,
        },
      }),
    ),
  );

  const response = NextResponse.json({ applications: created }, { status: 201 });
  setWorkspaceCookie(response, user.id);
  return response;
}
