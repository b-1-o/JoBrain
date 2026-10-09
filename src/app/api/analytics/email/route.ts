import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildApplicationAnalytics, parseAnalyticsRange } from "@/lib/analytics";
import { requireAuthUser } from "@/lib/require-auth-user";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Sign in to email your analytics." }, { status: 401 });
    if (!user.email) {
      return NextResponse.json({ error: "Your account has no verified email address." }, { status: 400 });
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? "587");
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM?.trim() || smtpUser;
    if (!host || !Number.isFinite(port) || !smtpUser || !smtpPass || !from) {
      return NextResponse.json(
        { error: "Email delivery is not configured yet. Set SMTP_HOST, SMTP_USER and SMTP_PASS in Vercel. SMTP_PORT defaults to 587; SMTP_FROM is optional and defaults to SMTP_USER." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { range?: unknown };
    const range = parseAnalyticsRange(body.range);
    const analytics = await buildApplicationAnalytics(user.id, range);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const rows = analytics.series
      .filter((point) => point.tracked || point.submitted)
      .map((point) => (
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${point.date}</td><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${point.tracked}</td><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${point.submitted}</td></tr>`
      ))
      .join("");
    const periodLabel = `${analytics.startDate} — ${analytics.endDate}`;
    const name = escapeHtml(user.name ?? "there");

    await transport.sendMail({
      from,
      to: user.email,
      subject: `JoBrain job search report · ${analytics.range}`,
      text: [
        `Hi ${user.name ?? "there"},`,
        "",
        `Your JoBrain job-search report for ${periodLabel}:`,
        `Roles tracked: ${analytics.trackedCount}`,
        `Applications submitted: ${analytics.submittedCount}`,
        "",
        "Sent to the primary email address on your JoBrain account.",
      ].join("\n"),
      html: `<!doctype html><html><body style="margin:0;padding:32px;background:#f4f6f8;font-family:Arial,sans-serif;color:#18212a"><main style="max-width:640px;margin:0 auto;padding:28px;border:1px solid #dde3e8;border-radius:22px;background:#fff"><div style="font-size:11px;letter-spacing:2px;color:#64748b;font-weight:700">JOBRAIN · ACTIVITY REPORT</div><h1 style="font-size:27px;letter-spacing:-.8px;margin:12px 0 8px">Your search, in motion.</h1><p style="color:#64748b;font-size:13px">Hi ${name} — here is your activity from ${periodLabel}.</p><div style="display:flex;gap:12px;margin:24px 0"><div style="flex:1;background:#f3f6f8;padding:18px;border-radius:14px"><div style="font-size:10px;color:#64748b">ROLES TRACKED</div><div style="font-size:30px;font-weight:700;margin-top:6px">${analytics.trackedCount}</div></div><div style="flex:1;background:#f3f6f8;padding:18px;border-radius:14px"><div style="font-size:10px;color:#64748b">APPLICATIONS SUBMITTED</div><div style="font-size:30px;font-weight:700;margin-top:6px">${analytics.submittedCount}</div></div></div><h2 style="font-size:16px;margin:24px 0 10px">Daily activity</h2><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px 10px;background:#f3f6f8">Date</th><th style="text-align:right;padding:8px 10px;background:#f3f6f8">Tracked</th><th style="text-align:right;padding:8px 10px;background:#f3f6f8">Submitted</th></tr></thead><tbody>${rows || '<tr><td colspan="3" style="padding:12px 10px;color:#64748b">No application activity recorded in this period.</td></tr>'}</tbody></table><p style="margin-top:24px;color:#94a3b8;font-size:11px">This report was sent to your primary JoBrain account email.</p></main></body></html>`,
    });

    return NextResponse.json({ sent: true, email: user.email, range });
  } catch (error) {
    console.error("[JoBrain] Failed to email application analytics.", error);
    return NextResponse.json({ error: "Your report could not be emailed. Check the mail delivery configuration and retry." }, { status: 500 });
  }
}
