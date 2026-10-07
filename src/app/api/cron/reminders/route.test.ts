import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const runReminderWorker = vi.fn(async ({ dryRun }: { dryRun?: boolean } = {}) => ({
  dryRun: dryRun ?? false,
  eligible: 1,
  sent: dryRun ? 0 : 1,
  skipped: 0,
  applicationIds: dryRun ? [] : ["app-1"],
}));

vi.mock("@/lib/reminders", () => ({ runReminderWorker }));

vi.mock("@/lib/api-security", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, response: null })),
}));

vi.mock("@/lib/telemetry", () => ({
  captureError: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/cron/reminders", () => {
  beforeEach(() => {
    runReminderWorker.mockClear();
    process.env.CRON_SECRET = "secret";
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/reminders"),
    );

    expect(response.status).toBe(401);
    expect(runReminderWorker).not.toHaveBeenCalled();
  });

  it("runs the authenticated reminder worker", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/reminders", {
        headers: { "x-jobrain-cron-secret": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ sent: 1 });
    expect(runReminderWorker).toHaveBeenCalledWith({ dryRun: false });
  });

  it("supports authenticated dry-run mode without sending", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/reminders?dryRun=1", {
        headers: { "x-jobrain-cron-secret": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      dryRun: true,
      sent: 0,
    });
    expect(runReminderWorker).toHaveBeenCalledWith({ dryRun: true });
  });
});
