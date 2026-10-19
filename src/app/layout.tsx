import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "./performance.css";
import "./redesign.css";
import PreferencesBootstrap from "@/components/PreferencesBootstrap";
import RouteTransitionFeedback from "@/components/RouteTransitionFeedback";
import AccountRouteBoundary from "@/components/AccountRouteBoundary";

export const metadata: Metadata = {
  title: "JoBrain — Job Search Intelligence",
  description:
    "Realtime job search, application tracking, and funnel analytics.",
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (
  process.env.VERCEL_ENV === "production" &&
  (!clerkPublishableKey?.startsWith("pk_live_") || !clerkSecretKey?.startsWith("sk_live_"))
) {
  console.warn(
    "[JoBrain] Clerk production keys are not configured. Add a pk_live_ publishable key and sk_live_ secret key in Vercel before enabling production sign-in.",
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><div className="jb-wallpaper-layer" aria-hidden="true" /><ClerkProvider><PreferencesBootstrap /><RouteTransitionFeedback /><AccountRouteBoundary>{children}</AccountRouteBoundary></ClerkProvider></body>
    </html>
  );
}