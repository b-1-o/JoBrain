import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const EMAIL_DOMAIN = "workspace.jobrain.local";

export async function getWorkspaceUser(workspaceId?: string | null) {
  const { userId } = await auth();

  if (userId) {
    const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (existing) return { user: existing, isNew: false };

    const clerkUser = await currentUser();
    const primaryEmail =
      clerkUser?.emailAddresses.find(
        (entry) => entry.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (primaryEmail) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: primaryEmail } });

      if (existingByEmail) {
        const linked = existingByEmail.clerkId
          ? existingByEmail
          : await prisma.user.update({
              where: { id: existingByEmail.id },
              data: {
                clerkId: userId,
                name:
                  [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
                  existingByEmail.name,
                image: clerkUser?.imageUrl ?? existingByEmail.image,
              },
            });

        return { user: linked, isNew: false };
      }

      const created = await prisma.user.create({
        data: {
          email: primaryEmail,
          name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
          image: clerkUser?.imageUrl ?? null,
          clerkId: userId,
          timezone: "UTC",
        },
      });

      return { user: created, isNew: true };
    }
  }

  if (workspaceId) {
    const existing = await prisma.user.findUnique({ where: { id: workspaceId } });
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
