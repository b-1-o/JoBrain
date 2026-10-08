import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function requireAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (entry) => entry.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) throw new Error("Clerk account has no email address.");

  return prisma.user.upsert({
    where: { email },
    update: {
      clerkId: userId,
      name:
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || undefined,
      image: clerkUser?.imageUrl ?? undefined,
    },
    create: {
      clerkId: userId,
      email,
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
      image: clerkUser?.imageUrl ?? null,
      timezone: "UTC",
    },
  });
}
