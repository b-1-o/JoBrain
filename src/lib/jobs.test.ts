import { afterEach, describe, expect, it, vi } from "vitest";
import { searchJobs } from "./jobs";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchJobs", () => {
  it("merges providers, filters remote jobs, and returns source health", async () => {
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
                candidate_required_location: "Worldwide",
                url: "https://example.com/beta",
                description: "<p>Next.js</p>",
                publication_date: "2026-10-06T13:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("arbeitnow.com/api/job-board-api")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                slug: "frontend-three",
                title: "Backend Developer",
                company_name: "Gamma",
                location: "Berlin",
                remote: false,
                url: "https://example.com/gamma",
                description: "Server side",
                created_at: 1791291600,
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    });

    vi.stubGlobal("fetch", fakeFetch);

    const result = await searchJobs({
      query: "frontend",
      location: "",
      remoteOnly: true,
      source: "all",
      limit: 20,
    });

    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0].company).toBe("Alpha");
    expect(result.jobs[1].company).toBe("Beta");
    expect(result.sources.remoteok).toBe("ok");
    expect(result.sources.remotive).toBe("ok");
    expect(result.sources.arbeitnow).toBe("ok");
    expect(result.sources.hh).toBe("ok");
  });
});