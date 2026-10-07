import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { searchJobs } from "@/lib/jobs";
import { server } from "@/test/msw";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("searchJobs with MSW", () => {
  it("intercepts a provider and keeps the search path offline", async () => {
    const providerResponse = await fetch("https://remoteok.com/api");
    expect(providerResponse.ok).toBe(true);

    const providerPayload = (await providerResponse.json()) as unknown[];
    expect(Array.isArray(providerPayload)).toBe(true);
    expect(providerPayload).toHaveLength(1);

    process.env.SERPAPI_API_KEY = "test";
    process.env.ADZUNA_APP_ID = "test";
    process.env.ADZUNA_APP_KEY = "test";

    const result = await searchJobs({
      query: "",
      location: "",
      source: "remoteok",
      platform: "all",
      experience: "all",
      remoteOnly: false,
      limit: 20,
    });

    expect(result.sources).toMatchObject({ remoteok: "ok" });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.company).toBe("Remote Fixtures");
  });
});
