import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-security", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, response: null })),
  sameOrigin: vi.fn(() => true),
}));

vi.mock("@/lib/current-user", () => ({
  getWorkspaceUser: vi.fn(async () => ({
    user: { id: "user-1" },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      create: vi.fn(async ({ data }) => ({
        id: "application-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      findMany: vi.fn(async () => []),
    },
  },
}));

import { POST, PATCH, DELETE } from "./route";

describe("/api/applications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed create payloads", async () => {
    const request = new NextRequest("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ company: "", role: "Frontend" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("accepts validated create payloads and scopes them to workspace user", async () => {
    const request = new NextRequest("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({
        company: "Example",
        role: "Frontend Developer",
        source: "OTHER",
        contactEmail: "candidate@example.com",
        nextActionAt: "2026-10-07T18:00:00.000Z",
      }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.application.company).toBe("Example");
    expect(body.application.id).toBe("application-1");
  });

  it("rejects cross-origin mutations", async () => {
    const request = new NextRequest("http://localhost/api/applications", {
      method: "DELETE",
      headers: { origin: "https://attacker.example" },
    });

    const { sameOrigin } = await import("@/lib/api-security");
    vi.mocked(sameOrigin).mockReturnValueOnce(false);

    const response = await DELETE(request);
    expect(response.status).toBe(403);
  });

  it("validates patch ids", async () => {
    const request = new NextRequest("http://localhost/api/applications", {
      method: "PATCH",
      body: JSON.stringify({ id: "" }),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });
});
