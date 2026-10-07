import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  setExtra: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  withScope(callback: (scope: { setExtra: typeof sentry.setExtra }) => void) {
    callback({ setExtra: sentry.setExtra });
  },
  captureException: sentry.captureException,
}));

import { captureError } from "@/lib/telemetry";

describe("captureError", () => {
  beforeEach(() => {
    sentry.captureException.mockClear();
    sentry.setExtra.mockClear();
  });

  it("reports errors to Sentry with request context", () => {
    const error = new Error("test");
    captureError(error, { route: "/api/jobs", method: "GET" });
    expect(sentry.setExtra).toHaveBeenCalledWith("route", "/api/jobs");
    expect(sentry.setExtra).toHaveBeenCalledWith("method", "GET");
    expect(sentry.captureException).toHaveBeenCalledWith(error);
  });
});
