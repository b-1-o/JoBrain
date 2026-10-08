import nodemailer from "nodemailer";
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

export async function sendNewsletter(subject: string, text: string) {
  const transporter = createTransport();
  if (!transporter) throw new Error("SMTP is not configured");

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    select: { email: true },
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("SMTP_FROM is not configured");

  let sent = 0;
  for (const subscriber of subscribers) {
    await transporter.sendMail({ from, to: subscriber.email, subject, text });
    sent += 1;
  }

  return { sent };
}
