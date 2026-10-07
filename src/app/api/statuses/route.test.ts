import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-security", () => ({
  enforceRateLimit: vi.fn(async () => ({ allowed: true, response: null })),
  sameOrigin: vi.fn(() => true),
}));

vi.mock("@/lib/current-user", () => ({
  getWorkspaceUser: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    applicationStatusDefinition: {
      findMany: vi.fn(async () => [
        {
          id: "status-1",
          userId: "user-1",
          key: "PHONE_SCREEN",
          label: "Phone Screen",
          category: "SCREENING",
          color: "blue",
          sortOrder: 15,
          isSystem: false,
        },
      ]),
      create: vi.fn(async ({ data }) => ({ id: "status-2", ...data })),
    },
  },
}));

import { GET, POST } from "./route";

describe("/api/statuses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns workspace-visible status definitions", async () => {
    const response = await GET(new NextRequest("http://localhost/api/statuses"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      statuses: [{ label: "Phone Screen" }],
    });
  });

  it("creates a validated custom status", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/statuses", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({
          label: "Hiring Manager",
          category: "SCREENING",
          color: "blue",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      status: {
        key: "HIRING_MANAGER",
        label: "Hiring Manager",
        userId: "user-1",
      },
    });
  });
});
