"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FolderKanban,
  History,
  Image as ImageIcon,
  SlidersHorizontal,
  UserRound,
  ArrowUpRight,
} from "lucide-react";

const accountItems = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "History", href: "/history", icon: History },
  { label: "Notifications", href: "/notifications", icon: Bell },
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
    <nav className="account-nav" aria-label="Account navigation">
      <div className="account-nav-topline">
        <Link className="account-nav-brand" href="/" aria-label="JoBrain home">
          <span className="account-nav-mark" aria-hidden="true">J</span>
          <span className="account-nav-brand-copy">
            <strong>JoBrain</strong>
            <small>Career workspace</small>
          </span>
        </Link>
        <Link
          className="account-nav-media"
          href="/settings?section=media"
          aria-label="Open avatar, banner and background settings"
          onClick={(event) => {
            if (pathname === "/settings") {
              event.preventDefault();
              window.history.replaceState({}, "", "/settings?section=media");
              window.dispatchEvent(new CustomEvent("jobrain:settings-section", { detail: "Media studio" }));
              return;
            }
            window.dispatchEvent(new Event("jobrain:navigate-start"));
          }}
        >
          <span className="account-nav-media-icon"><ImageIcon size={16} strokeWidth={1.8} /></span>
          <span className="account-nav-media-copy">
            <strong>Media & appearance</strong>
            <small>Personalize your workspace</small>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="account-nav-links" aria-label="Account sections">
        {accountItems.map(({ label, href, icon: Icon }) => {
          const selected = pathname === href || activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              className={"account-nav-item" + (selected ? " is-active" : "")}
              aria-current={selected ? "page" : undefined}
              onClick={() => {
                if (pathname !== href) window.dispatchEvent(new Event("jobrain:navigate-start"));
              }}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="account-nav-footer">
        <span className="account-nav-footer-dot" aria-hidden="true" />
        <span>YOUR WORKSPACE</span>
      </div>
    </nav>
  );
}
