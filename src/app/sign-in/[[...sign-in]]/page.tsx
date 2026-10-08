import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="jb-auth-page">
      <SignIn />
    </main>
  );
}
