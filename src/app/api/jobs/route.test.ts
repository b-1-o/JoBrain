import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-security", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, response: null })),
}));

vi.mock("@/lib/job-cache", () => ({
  getCachedJobs: vi.fn(async () => null),
  setCachedJobs: vi.fn(async () => undefined),
}));

vi.mock("@/lib/jobs", () => ({
  searchJobs: vi.fn(async () => ({
    jobs: [
      {
        id: "job-1",
        source: "remoteok",
        platform: "remoteok",
        level: "junior",
        title: "Junior Frontend Developer",
        company: "Example",
        location: "Remote",
        remote: true,
        url: "https://example.com/jobs/1",
        description: "Frontend role",
        tags: ["React"],
        postedAt: new Date().toISOString(),
      },
    ],
    sources: { remoteok: "ok" },
    fetchedAt: new Date().toISOString(),
  })),
}));

import { GET } from "./route";

describe("GET /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid query parameters", async () => {
    const request = new NextRequest(
      "http://localhost/api/jobs?experience=not-a-level",
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid search parameters",
    });
  });

  it("normalizes valid parameters and returns jobs", async () => {
    const request = new NextRequest(
      "http://localhost/api/jobs?query=frontend&experience=junior&remote=true&limit=20",
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe("Junior Frontend Developer");
    expect(response.headers.get("X-Cache")).toBe("MISS");
  });
});
