"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import NewsletterToggle from "@/components/NewsletterToggle";

export default function AuthControls() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="jb-auth-controls">
        <SignInButton mode="modal">
          <button type="button" className="jb-auth-button jb-auth-button-ghost">Sign in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="jb-auth-button jb-auth-button-solid">Create account</button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="jb-auth-controls">
      <NewsletterToggle />
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
