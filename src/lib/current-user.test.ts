import { describe, expect, it, vi } from "vitest";

const { auth, currentUser, prisma } = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth, currentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { getWorkspaceUser } from "./current-user";

describe("getWorkspaceUser", () => {
  it("uses the Clerk-linked database user when signed in", async () => {
    auth.mockResolvedValue({ userId: "user_clerk_123" });
    const existing = { id: "db-1", clerkId: "user_clerk_123", email: "user@example.com" };
    prisma.user.findUnique.mockResolvedValueOnce(existing);

    const result = await getWorkspaceUser();

    expect(result).toEqual({ user: existing, isNew: false });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "user_clerk_123" },
    });
  });

  it("falls back to the workspace cookie for signed-out users", async () => {
    auth.mockResolvedValue({ userId: null });
    const existing = { id: "workspace-1", email: "workspace.jobrain.local" };
    prisma.user.findUnique.mockResolvedValueOnce(existing);

    const result = await getWorkspaceUser("workspace-1");

    expect(result).toEqual({ user: existing, isNew: false });
    expect(currentUser).not.toHaveBeenCalled();
  });
});
