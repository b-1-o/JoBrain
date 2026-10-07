import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { searchJobs } from "@/lib/jobs";
import { server } from "@/test/msw";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("searchJobs with MSW", () => {
  it("aggregates provider responses without network access", async () => {
    process.env.SERPAPI_API_KEY = "test";
    process.env.ADZUNA_APP_ID = "test";
    process.env.ADZUNA_APP_KEY = "test";

    const result = await searchJobs({
      query: "frontend",
      location: "",
      source: "all",
      platform: "all",
      experience: "all",
      remoteOnly: false,
      limit: 20,
    });

    expect(result.jobs.length).toBeGreaterThanOrEqual(5);
    expect(result.sources).toMatchObject({
      remoteok: "ok",
      remotive: "ok",
      jobicy: "ok",
      adzuna: "ok",
      googlejobs: "ok",
    });
  });
});
