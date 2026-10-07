import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sendMail = vi.fn(async () => undefined);

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

vi.mock("@/lib/api-security", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(async () => [
        {
          id: "app-1",
          company: "Example",
          role: "Frontend Developer",
          contactEmail: "recruiter@example.com",
          nextActionAt: new Date(Date.now() + 5 * 60 * 1000),
          lastContactAt: null,
        },
      ]),
    },
  },
}));

import { POST } from "./route";

describe("POST /api/reminders", () => {
  beforeEach(() => {
    sendMail.mockClear();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "password";
    process.env.SMTP_FROM = "noreply@example.com";
    process.env.CRON_SECRET = "secret";
  });

  it("requires cron authorization", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/reminders", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends due reminders with the configured transport", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/reminders", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ sent: 1 });
  });
});
