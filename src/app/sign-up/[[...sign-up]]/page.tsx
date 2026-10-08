import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#d3d3d3] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center justify-center">
        <SignUp />
      </div>
    </main>
  );
}
