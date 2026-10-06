import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchJobs } from "./jobs";

beforeEach(() => {
  process.env.ADZUNA_APP_ID = "test-app-id";
  process.env.ADZUNA_APP_KEY = "test-app-key";
  process.env.SERPAPI_API_KEY = "test-serpapi-key";
});

afterEach(() => {
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;
  delete process.env.SERPAPI_API_KEY;
  vi.restoreAllMocks();
});

describe("searchJobs", () => {
  it("merges US and remote providers and keeps source and level metadata", async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("serpapi.com/search.json")) {
        return new Response(
          JSON.stringify({
            jobs_results: [
              {
                job_id: "linkedin-1",
                title: "Junior Frontend Engineer",
                company_name: "Alpha",
                location: "Los Angeles, CA",
                via: "LinkedIn",
                share_link: "https://www.google.com/jobs/linkedin-1",
                extensions: ["Full-time", "2 days ago"],
                detected_extensions: {
                  posted_at: "2 days ago",
                  schedule_type: "Full-time",
                },
                description: "React and TypeScript",
                apply_options: [
                  {
                    title: "LinkedIn",
                    link: "https://www.linkedin.com/jobs/view/linkedin-1",
                  },
                ],
              },
              {
                job_id: "indeed-1",
                title: "Senior Frontend Engineer",
                company_name: "Beta",
                location: "Remote",
                via: "Indeed",
                share_link: "https://www.google.com/jobs/indeed-1",
                extensions: ["Work from home", "1 day ago"],
                detected_extensions: {
                  posted_at: "1 day ago",
                  work_from_home: true,
                },
                description: "Senior React role",
                apply_options: [
                  {
                    title: "Indeed",
                    link: "https://www.indeed.com/viewjob?jk=indeed-1",
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("remoteok.com/api")) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              slug: "frontend-one",
              position: "Frontend Developer",
              company: "Remote Alpha",
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
                company_name: "Remote Beta",
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
                companyName: "Remote Gamma",
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
      remoteOnly: false,
      source: "all",
      platform: "all",
      experience: "all",
      limit: 20,
    });

    expect(result.jobs.length).toBeGreaterThanOrEqual(6);

    const linkedIn = result.jobs.find((job) => job.platform === "linkedin");
    const indeed = result.jobs.find((job) => job.platform === "indeed");

    expect(linkedIn?.level).toBe("junior");
    expect(linkedIn?.url).toContain("linkedin.com");
    expect(indeed?.level).toBe("senior");
    expect(indeed?.remote).toBe(true);
    expect(result.sources.googlejobs).toBe("ok");
    expect(result.sources.remoteok).toBe("ok");
    expect(result.sources.remotive).toBe("ok");
    expect(result.sources.jobicy).toBe("ok");
    expect(result.sources.adzuna).toBe("ok");
  });

  it("filters by platform and experience level", async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("serpapi.com/search.json")) {
        return new Response(
          JSON.stringify({
            jobs_results: [
              {
                job_id: "linkedin-junior",
                title: "Junior Frontend Engineer",
                company_name: "Alpha",
                location: "Los Angeles, CA",
                via: "LinkedIn",
                share_link: "https://www.google.com/jobs/linkedin-junior",
                description: "React",
                apply_options: [
                  {
                    title: "LinkedIn",
                    link: "https://www.linkedin.com/jobs/view/junior",
                  },
                ],
              },
              {
                job_id: "indeed-senior",
                title: "Senior Frontend Engineer",
                company_name: "Beta",
                location: "Remote",
                via: "Indeed",
                share_link: "https://www.google.com/jobs/indeed-senior",
                description: "React",
                apply_options: [
                  {
                    title: "Indeed",
                    link: "https://www.indeed.com/viewjob?jk=senior",
                  },
                ],
                detected_extensions: {
                  work_from_home: true,
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ jobs: [], results: [] }), {
        status: 200,
      });
    });

    vi.stubGlobal("fetch", fakeFetch);

    const result = await searchJobs({
      query: "frontend",
      location: "",
      remoteOnly: false,
      source: "all",
      platform: "linkedin",
      experience: "junior",
      limit: 20,
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.platform).toBe("linkedin");
    expect(result.jobs[0]?.level).toBe("junior");
  });
});
