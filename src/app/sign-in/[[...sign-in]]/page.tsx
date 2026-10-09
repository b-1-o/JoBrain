import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import AuthBackdrop from "@/components/AuthBackdrop";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <main className="jb-auth-page">
      <AuthBackdrop />
      <div className="jb-auth-noise" aria-hidden="true" />
      <div className="jb-auth-shell">
        <Link className="jb-auth-brand" href="/">
          <span className="jb-brand-mark">JB</span>
          <span>JOBRAIN</span>
        </Link>
        <SignIn appearance={clerkAppearance} />
      </div>
    </main>
  );
}
