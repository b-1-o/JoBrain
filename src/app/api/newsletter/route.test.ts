import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, currentUser, prisma } = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  prisma: {
    newsletterSubscriber: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth, currentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { DELETE, GET, POST } from "./route";

describe("newsletter route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated reads", async () => {
    auth.mockResolvedValue({ userId: null });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns subscription state for the authenticated user", async () => {
    auth.mockResolvedValue({ userId: "user_1" });
    prisma.newsletterSubscriber.findUnique.mockResolvedValue({ unsubscribedAt: null });

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ subscribed: true });
  });

  it("subscribes using the primary Clerk email", async () => {
    auth.mockResolvedValue({ userId: "user_1" });
    currentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "person@example.com" },
      emailAddresses: [],
    });
    prisma.newsletterSubscriber.upsert.mockResolvedValue({ id: "subscriber_1" });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkUserId: "user_1" },
        create: { clerkUserId: "user_1", email: "person@example.com" },
        update: { email: "person@example.com", unsubscribedAt: null },
      }),
    );
  });

  it("marks the subscriber as unsubscribed", async () => {
    auth.mockResolvedValue({ userId: "user_1" });

    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkUserId: "user_1" } }),
    );
  });
});
