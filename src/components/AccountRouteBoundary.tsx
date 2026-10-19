"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Search, UserRound } from "lucide-react";

const ACCOUNT_ROUTES = new Set([
  "/profile",
  "/settings",
  "/projects",
  "/history",
  "/notifications",
  "/recommendations",
]);

export default function AccountRouteBoundary({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const requiresAccount = ACCOUNT_ROUTES.has(pathname);

  if (!requiresAccount) return children;

  if (!isLoaded) {
    return (
      <main className="account-gate-page" aria-busy="true">
        <div className="account-gate-card account-gate-loading">
          <span className="account-gate-mark">J</span>
          <span className="account-gate-kicker">YOUR WORKSPACE</span>
          <h1>Getting your workspace ready…</h1>
          <div className="account-gate-loader" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    const returnPath = pathname || "/";
    const signInHref = "/sign-in?redirect_url=" + encodeURIComponent(returnPath);
    const signUpHref = "/sign-up?redirect_url=" + encodeURIComponent(returnPath);

    return (
      <main className="account-gate-page">
        <section className="account-gate-card" aria-labelledby="account-gate-title">
          <div className="account-gate-top">
            <Link className="account-gate-brand" href="/" aria-label="Back to JoBrain">
              <span className="account-gate-mark">J</span>
              <span>JoBrain</span>
            </Link>
            <span className="account-gate-kicker"><LockKeyhole size={13} /> ACCOUNT FEATURE</span>
          </div>
          <div className="account-gate-icon"><UserRound size={25} strokeWidth={1.7} /></div>
          <h1 id="account-gate-title">Your search stays open.</h1>
          <p>
            Keep browsing live job listings without an account. Create a free JoBrain account when
            you’re ready to save roles, track applications, manage your profile, and see personal
            statistics.
          </p>
          <div className="account-gate-benefits">
            <div><Search size={15} /><span>Search and open jobs — no sign-up needed</span></div>
            <div><LockKeyhole size={15} /><span>Your applications and personal data stay private</span></div>
          </div>
          <div className="account-gate-actions">
            <Link href={signUpHref} className="account-gate-primary">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href={signInHref} className="account-gate-secondary">Sign in</Link>
          </div>
          <Link className="account-gate-back" href="/">
            <ArrowLeft size={14} /> Continue as guest
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
