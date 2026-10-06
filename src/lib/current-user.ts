import { prisma } from "@/lib/prisma";

const EMAIL_DOMAIN = "workspace.jobrain.local";

export async function getWorkspaceUser(workspaceId?: string | null) {
  if (workspaceId) {
    const existing = await prisma.user.findUnique({
      where: { id: workspaceId },
    });

    if (existing) return { user: existing, isNew: false };
  }

  const id = crypto.randomUUID();

  const user = await prisma.user.create({
    data: {
      email: id + "@" + EMAIL_DOMAIN,
      name: "Local workspace",
      handle: "workspace-" + id.slice(0, 8),
      timezone: "UTC",
    },
  });

  return { user, isNew: true };
}