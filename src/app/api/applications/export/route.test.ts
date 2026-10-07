import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-security", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, response: null })),
}));

vi.mock("@/lib/current-user", () => ({
  getWorkspaceUser: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(async () => [
        {
          id: "app-1",
          company: "Example, Inc.",
          role: "Frontend Developer",
          source: "OTHER",
          status: "APPLIED",
          url: "https://example.com/jobs/1",
          salaryMin: 100000,
          salaryMax: 120000,
          currency: "USD",
          contactName: "Recruiter",
          contactEmail: "recruiter@example.com",
          appliedAt: new Date("2026-10-01T12:00:00.000Z"),
          nextActionAt: new Date("2026-10-07T18:00:00.000Z"),
          lastContactAt: null,
          notes: 'Keep "portfolio" ready',
          createdAt: new Date("2026-10-01T12:00:00.000Z"),
          updatedAt: new Date("2026-10-06T12:00:00.000Z"),
        },
      ]),
    },
  },
}));

import { GET } from "./route";

describe("application exports", () => {
  it("returns Excel-friendly UTF-8 CSV", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/export?format=csv"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const text = await response.text();
    expect(text).toContain("Company");
    expect(text).toContain('"Example, Inc."');
    expect(text).toContain('"Keep ""portfolio"" ready"');
  });

  it("returns a valid iCalendar feed for scheduled actions", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/export?format=ics"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("SUMMARY:Example\\, Inc. — Frontend Developer");
    expect(text).toContain("END:VCALENDAR");
  });
});
