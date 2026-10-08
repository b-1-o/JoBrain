import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { id?: unknown; all?: unknown };

  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (typeof body.id === "string") {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { readAt: new Date() },
    });
  } else {
    return NextResponse.json({ error: "Missing notification id." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
