"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  FolderKanban,
  History,
  Image as ImageIcon,
  Sparkles,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

const accountItems = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "For you", href: "/recommendations", icon: Sparkles },
  { label: "History", href: "/history", icon: History },
  { label: "Alerts", href: "/notifications", icon: Bell },
] as const;

type AccountSection =
  | "profile"
  | "settings"
  | "projects"
  | "history"
  | "notifications"
  | "recommendations"
  | "workspace";

export default function AccountNav({ active }: { active: AccountSection }) {
  const pathname = usePathname();
  const activeHref = active === "workspace" ? "/" : `/${active}`;

  return (
    <nav className="account-nav" aria-label="Workspace navigation">
      <Link className="account-nav-brand" href="/" aria-label="Return to JoBrain overview">
        <span className="account-nav-mark" aria-hidden="true">J</span>
        <span className="account-nav-brand-copy">
          <strong>JoBrain</strong>
          <small>WORKSPACE</small>
        </span>
      </Link>

      <div className="account-nav-links" aria-label="Account sections">
        {accountItems.map(({ label, href, icon: Icon }) => {
          const selected = pathname === href || activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              className={"account-nav-item" + (selected ? " is-active" : "")}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <Link
        className={"account-nav-media" + (pathname === "/settings" ? " is-active" : "")}
        href="/settings?section=media"
        aria-label="Personalize appearance"
      >
        <ImageIcon size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>Appearance</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </Link>
    </nav>
  );
}
