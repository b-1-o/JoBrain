"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  FolderKanban,
  History,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import OptionWheel from "@/components/OptionWheel";

const accountItems = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "History", href: "/history", icon: History },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Recommended", href: "/recommendations", icon: Sparkles },
  { label: "Workspace", href: "/", icon: LayoutDashboard },
] as const;

type AccountSection = "profile" | "settings" | "projects" | "history" | "notifications" | "recommendations" | "workspace";

export default function AccountNav({ active }: { active: AccountSection }) {
  const router = useRouter();
  const activeHref = active === "workspace" ? "/" : `/${active}`;
  const selected = Math.max(0, accountItems.findIndex((item) => item.href === activeHref));
  return (
    <nav className="account-nav" aria-label="Account navigation">
      <Link className="account-nav-brand" href="/" aria-label="JoBrain workspace">
        <span className="account-nav-mark" aria-hidden="true">J</span>
        <span className="account-nav-brand-copy">
          <strong>JoBrain</strong>
          <small>Command center</small>
        </span>
        <span className="account-nav-brand-signal" aria-hidden="true" />
      </Link>
      <div className="account-nav-kicker">NAVIGATE</div>
      <OptionWheel
        items={accountItems.map((item) => item.label)}
        icons={accountItems.map(({ icon: Icon }) => <Icon size={17} strokeWidth={1.7} />)}
        defaultSelected={selected}
        textColor="#86949e"
        activeColor="#f3f7fa"
        fontSize={1.05}
        spacing={1.65}
        curve={0.82}
        tilt={5.5}
        blur={0.9}
        fade={0.17}
        minOpacity={0.18}
        smoothing={180}
        inset={16}
        onChange={(index) => {
          const next = accountItems[index];
          if (next) router.push(next.href);
        }}
        className="account-nav-wheel"
      />
      <div className="account-nav-footer">
        <span className="account-nav-footer-dot" aria-hidden="true" />
        <span>YOUR WORKSPACE</span>
      </div>
    </nav>
  );
}
