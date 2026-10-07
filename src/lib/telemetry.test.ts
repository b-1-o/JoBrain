import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  withScope(callback: (scope: { setExtra: typeof vi.fn }) => void) {
    callback({ setExtra: vi.fn() });
  },
  captureException,
}));

import { captureError } from "@/lib/telemetry";

describe("captureError", () => {
  beforeEach(() => captureException.mockClear());

  it("reports errors to Sentry with request context", () => {
    const error = new Error("test");
    captureError(error, { route: "/api/jobs", method: "GET" });
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
