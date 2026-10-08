import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="jb-auth-page">
      <SignUp />
    </main>
  );
}
