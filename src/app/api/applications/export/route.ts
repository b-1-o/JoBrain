import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api-security";
import { getWorkspaceUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

function icsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r?\n", "\\n");
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const querySchema = z.object({
  format: z.enum(["csv", "ics"]).default("csv"),
});

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "applications-export", 30, "1 m");
  if (!limited.allowed && limited.response) return limited.response;

  const parsed = querySchema.safeParse({
    format: request.nextUrl.searchParams.get("format") ?? "csv",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  }

  const { user } = await getWorkspaceUser(
    request.cookies.get("jobrain_workspace")?.value,
  );
  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (parsed.data.format === "ics") {
    const events = applications
      .filter((app) => app.nextActionAt)
      .map((app) => {
        const start = app.nextActionAt as Date;
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        const summary = app.company + " — " + app.role;
        return [
          "BEGIN:VEVENT",
          "UID:" + app.id + "@jobrain",
          "DTSTAMP:" + icsDate(new Date()),
          "DTSTART:" + icsDate(start),
          "DTEND:" + icsDate(end),
          "SUMMARY:" + icsText(summary),
          "DESCRIPTION:" + icsText("JoBrain application next action"),
          "END:VEVENT",
        ].join("\r\n");
      });

    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JoBrain//Application Pipeline//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="jobrain-calendar.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  }

  const headers = [
    "Company",
    "Role",
    "Source",
    "Status",
    "URL",
    "Salary Min",
    "Salary Max",
    "Currency",
    "Contact Name",
    "Contact Email",
    "Applied At",
    "Next Action At",
    "Last Contact At",
    "Notes",
    "Created At",
    "Updated At",
  ];

  const rows = applications.map((app) =>
    [
      app.company,
      app.role,
      app.source,
      app.status,
      app.url,
      app.salaryMin,
      app.salaryMax,
      app.currency,
      app.contactName,
      app.contactEmail,
      app.appliedAt?.toISOString(),
      app.nextActionAt?.toISOString(),
      app.lastContactAt?.toISOString(),
      app.notes,
      app.createdAt.toISOString(),
      app.updatedAt.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );

  const body = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobrain-applications.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
