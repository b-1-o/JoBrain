import { NextResponse, type NextRequest } from "next/server";
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

export async function POST(request: NextRequest) {
  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );

  const existing = await prisma.application.count({
    where: { userId: user.id },
  });

  if (existing > 0) {
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    const response = NextResponse.json({ applications, reused: true });
    response.cookies.set("jobrain_workspace", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const created = [];

  for (const [company, role, status, source] of demo) {
    created.push(
      await prisma.application.create({
        data: {
          userId: user.id,
          company,
          role,
          status,
          source,
          url: "https://example.com/jobs",
          appliedAt:
            status === "FOUND"
              ? null
              : new Date(Date.now() - Math.floor(Math.random() * 18) * 86400000),
          nextActionAt:
            ["APPLIED", "SCREENING", "TECH"].includes(status)
              ? new Date(Date.now() + Math.floor(Math.random() * 7 + 1) * 86400000)
              : null,
          notes:
            status === "OFFER"
              ? "Strong product fit. Prepare negotiation notes."
              : undefined,
        },
      }),
    );
  }

  const response = NextResponse.json({ applications: created }, { status: 201 });
  response.cookies.set("jobrain_workspace", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}