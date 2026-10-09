import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import AuthBackdrop from "@/components/AuthBackdrop";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <main className="jb-auth-page">
      <AuthBackdrop />
      <div className="jb-auth-noise" aria-hidden="true" />
      <div className="jb-auth-shell">
        <Link className="jb-auth-brand" href="/">
          <span className="jb-brand-mark">JB</span>
          <span>JOBRAIN</span>
        </Link>
        <SignUp appearance={clerkAppearance} />
      </div>
    </main>
  );
}
