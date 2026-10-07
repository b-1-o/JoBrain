import { prisma } from "@/lib/prisma";

const EMAIL_DOMAIN = "workspace.jobrain.local";

const DEFAULT_STATUSES = [
  { key: "FOUND", label: "Found", category: "FOUND" as const, color: "neutral", sortOrder: 0 },
  { key: "APPLIED", label: "Applied", category: "APPLIED" as const, color: "blue", sortOrder: 10 },
  { key: "SCREENING", label: "Screening", category: "SCREENING" as const, color: "violet", sortOrder: 20 },
  { key: "TECH", label: "Technical", category: "TECH" as const, color: "amber", sortOrder: 30 },
  { key: "OFFER", label: "Offer", category: "OFFER" as const, color: "green", sortOrder: 40 },
  { key: "REJECTED", label: "Rejected", category: "REJECTED" as const, color: "red", sortOrder: 50 },
];

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
      statusDefinitions: {
        create: DEFAULT_STATUSES.map((status) => ({
          ...status,
          isSystem: true,
        })),
      },
    },
  });

  return { user, isNew: true };
}
