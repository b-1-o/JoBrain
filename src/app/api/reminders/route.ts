import nodemailer from "nodemailer";
import { NextResponse, type NextRequest } from "next/server";
import { getRedisClient } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization");
  return auth === "Bearer " + secret;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? "587");

  if (!host || !user || !password || !Number.isInteger(port)) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transporter = createTransport();
  if (!transporter) {
    return NextResponse.json({ error: "SMTP is not configured" }, { status: 503 });
  }

  const now = new Date();
  const dueSoon = new Date(now.getTime() + 15 * 60 * 1000);
  const overdueContact = new Date(now.getTime() - 7 * 86400000);

  const applications = await prisma.application.findMany({
    where: {
      OR: [
        {
          nextActionAt: {
            gte: now,
            lte: dueSoon,
          },
        },
        {
          nextActionAt: {
            lt: now,
          },
          lastContactAt: {
            lt: overdueContact,
          },
        },
      ],
      contactEmail: { not: null },
    },
    orderBy: { nextActionAt: "asc" },
    take: 50,
  });

  const redis = getRedisClient();
  const sent: string[] = [];

  for (const app of applications) {
    if (!app.contactEmail) continue;

    const bucket =
      app.nextActionAt && app.nextActionAt >= now
        ? "next:" + app.nextActionAt.toISOString().slice(0, 16)
        : "contact:" + now.toISOString().slice(0, 10);
    const dedupeKey = "jobrain:reminder:" + app.id + ":" + bucket;

    if (redis && (await redis.exists(dedupeKey))) continue;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: app.contactEmail,
      subject: "JoBrain reminder: " + app.company + " — " + app.role,
      text:
        "JoBrain reminder for " +
        app.role +
        " at " +
        app.company +
        ". Review the application and update the next action in JoBrain.",
    });

    if (redis) {
      await redis.set(dedupeKey, "1", { ex: 36 * 60 * 60 });
    }
    sent.push(app.id);
  }

  return NextResponse.json({ sent: sent.length, applicationIds: sent });
}

export { POST as GET };
