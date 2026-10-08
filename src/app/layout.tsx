import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoBrain — Job Search Intelligence",
  description:
    "Realtime job search, application tracking, and funnel analytics.",
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (process.env.VERCEL_ENV === "production") {
  if (!clerkPublishableKey?.startsWith("pk_live_")) {
    throw new Error("JoBrain production requires a Clerk pk_live_ publishable key.");
  }
  if (!clerkSecretKey?.startsWith("sk_live_")) {
    throw new Error("JoBrain production requires a Clerk sk_live_ secret key.");
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  );
}