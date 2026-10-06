import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchJobs } from "./jobs";

beforeEach(() => {
  process.env.ADZUNA_APP_ID = "test-app-id";
  process.env.ADZUNA_APP_KEY = "test-app-key";
});

afterEach(() => {
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;
  vi.restoreAllMocks();
});

describe("searchJobs", () => {
  it("merges US and remote providers, filters non-remote jobs, and returns source health", async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("remoteok.com/api")) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              slug: "frontend-one",
              position: "Frontend Developer",
              company: "Alpha",
              location: "Remote",
              description: "<p>React and TypeScript</p>",
              tags: ["react"],
              date: "2026-10-06T14:00:00.000Z",
            },
          ]),
          { status: 200 },
        );
      }

      if (url.includes("remotive.com/api/remote-jobs")) {
        return new Response(
          JSON.stringify({
            jobs: [
              {
                id: 2,
                title: "Frontend Engineer",
                company_name: "Beta",
                candidate_required_location: "USA",
                url: "https://example.com/beta",
                description: "<p>React frontend</p>",
                publication_date: "2026-10-06T13:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("jobicy.com/api/v2/remote-jobs")) {
        return new Response(
          JSON.stringify({
            jobs: [
              {
                id: 3,
                jobTitle: "Frontend Developer",
                companyName: "Gamma",
                jobGeo: "USA",
                url: "https://example.com/gamma",
                jobDescription: "<p>Next.js remote frontend role</p>",
                jobIndustry: ["Engineering"],
                pubDate: "2026-10-06T12:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("api.adzuna.com/v1/api/jobs/us/search/1")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 4,
                title: "Frontend Developer",
                company: { display_name: "Delta" },
                location: { display_name: "Los Angeles, California" },
                redirect_url: "https://example.com/delta",
                description: "On-site React role",
                category: { label: "IT Jobs" },
                created: "2026-10-06T11:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fakeFetch);

    const result = await searchJobs({
      query: "frontend",
      location: "",
      remoteOnly: true,
      source: "all",
      limit: 20,
    });

    expect(result.jobs).toHaveLength(3);
    expect(result.jobs[0]?.company).toBe("Alpha");
    expect(result.jobs[1]?.company).toBe("Beta");
    expect(result.jobs[2]?.company).toBe("Gamma");
    expect(result.sources.remoteok).toBe("ok");
    expect(result.sources.remotive).toBe("ok");
    expect(result.sources.jobicy).toBe("ok");
    expect(result.sources.adzuna).toBe("ok");
  });
});
