import Link from "next/link";

export default function AccountNav({ active }: { active: "profile" | "settings" | "projects" | "history" }) {
  return (
    <nav className="account-nav" aria-label="Account navigation">
      <Link href="/profile" aria-current={active === "profile" ? "page" : undefined}>Profile</Link>
      <Link href="/settings" aria-current={active === "settings" ? "page" : undefined}>Settings</Link>
      <Link href="/projects" aria-current={active === "projects" ? "page" : undefined}>Projects</Link>
      <Link href="/history" aria-current={active === "history" ? "page" : undefined}>History</Link>
      <Link href="/">Workspace</Link>
    </nav>
  );
}
