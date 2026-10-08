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
  it("returns an existing Clerk-linked database user", async () => {
    auth.mockResolvedValue({ userId: "clerk-user-1" });
    const user = { id: "db-1", clerkId: "clerk-user-1", email: "user@example.com" };
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(getWorkspaceUser()).resolves.toEqual({ user, isNew: false });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: "clerk-user-1" } });
  });

  it("links an existing email record to Clerk", async () => {
    auth.mockResolvedValue({ userId: "clerk-user-2" });
    currentUser.mockResolvedValue({
      primaryEmailAddressId: "email-1",
      emailAddresses: [{ id: "email-1", emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.png",
    });
    const existing = { id: "db-2", clerkId: null, email: "user@example.com", name: null, image: null };
    const linked = { ...existing, clerkId: "clerk-user-2", name: "Test User", image: "https://example.com/avatar.png" };
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    prisma.user.update.mockResolvedValueOnce(linked);

    await expect(getWorkspaceUser()).resolves.toEqual({ user: linked, isNew: false });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("keeps the legacy workspace cookie path for signed-out users", async () => {
    auth.mockResolvedValue({ userId: null });
    const user = { id: "workspace-1", email: "workspace.jobrain.local" };
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(getWorkspaceUser("workspace-1")).resolves.toEqual({ user, isNew: false });
  });
});
