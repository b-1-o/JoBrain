import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getIdentity() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return { userId, email };
}

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { clerkUserId: identity.userId },
    select: { unsubscribedAt: true },
  });

  return NextResponse.json({ subscribed: Boolean(subscriber && !subscriber.unsubscribedAt) });
}

export async function POST() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { clerkUserId: identity.userId },
    create: { clerkUserId: identity.userId, email: identity.email },
    update: { email: identity.email, unsubscribedAt: null },
    select: { id: true },
  });

  return NextResponse.json({ subscribed: true, id: subscriber.id });
}

export async function DELETE() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.newsletterSubscriber.updateMany({
    where: { clerkUserId: identity.userId },
    data: { unsubscribedAt: new Date() },
  });

  return NextResponse.json({ subscribed: false });
}
