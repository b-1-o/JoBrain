import nodemailer from "nodemailer";
import { getRedisClient } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

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

export async function runReminderWorker(options?: { dryRun?: boolean }) {
  const dryRun = options?.dryRun ?? false;
  const transporter = createTransport();
  if (!transporter && !dryRun) {
    throw new Error("SMTP is not configured");
  }

  const now = new Date();
  const overdueContact = new Date(now.getTime() - 7 * 86400000);

  const applications = await prisma.application.findMany({
    where: {
      OR: [
        { nextActionAt: { lte: now } },
        { lastContactAt: { lt: overdueContact } },
      ],
      contactEmail: { not: null },
    },
    orderBy: { nextActionAt: "asc" },
    take: 50,
  });

  const redis = getRedisClient();
  const sent: string[] = [];
  const skipped: string[] = [];

  for (const app of applications) {
    if (!app.contactEmail) continue;

    const bucket =
      app.nextActionAt && app.nextActionAt <= now
        ? "next:" + app.nextActionAt.toISOString().slice(0, 10)
        : "contact:" + now.toISOString().slice(0, 10);
    const dedupeKey = "jobrain:reminder:" + app.id + ":" + bucket;

    if (redis && (await redis.exists(dedupeKey))) {
      skipped.push(app.id);
      continue;
    }

    if (!dryRun && transporter) {
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
    }

    if (!dryRun && redis) {
      await redis.set(dedupeKey, "1", { ex: 36 * 60 * 60 });
    }

    sent.push(app.id);
  }

  return {
    dryRun,
    eligible: applications.length,
    sent: sent.length,
    skipped: skipped.length,
    applicationIds: sent,
  };
}
