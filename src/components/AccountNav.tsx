"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FolderKanban,
  History,
  Image as ImageIcon,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import LatticeLoader from "@/components/LatticeLoader";
import OptionWheel from "@/components/OptionWheel";

const accountItems = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "History", href: "/history", icon: History },
  { label: "Notifications", href: "/notifications", icon: Bell },
] as const;

type AccountSection = "profile" | "settings" | "projects" | "history" | "notifications" | "recommendations" | "workspace";

export default function AccountNav({ active }: { active: AccountSection }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const activeHref = active === "workspace" ? "/" : `/${active}`;
  const selected = Math.max(0, accountItems.findIndex((item) => item.href === activeHref));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNavigatingTo(null));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  function navigate(href: string) {
    if (href === pathname) return;
    setNavigatingTo(href);
    window.dispatchEvent(new Event("jobrain:navigate-start"));
    router.push(href);
  }

  return (
    <nav className="account-nav" aria-label="Account navigation">
      <Link className="account-nav-brand" href="/" aria-label="JoBrain home">
        <span className="account-nav-mark" aria-hidden="true">J</span>
        <span className="account-nav-brand-copy">
          <strong>JoBrain</strong>
          <small>Command center</small>
        </span>
        <span className="account-nav-brand-signal" aria-hidden="true" />
      </Link>
      <Link className="account-nav-media" href="/settings?section=media" aria-label="Open avatar, banner and background settings">
        <span className="account-nav-media-icon"><ImageIcon size={15} strokeWidth={1.8} /></span>
        <span className="account-nav-media-copy">
          <strong>Media & appearance</strong>
          <small>Avatar · banner · background</small>
        </span>
        <span aria-hidden="true">↗</span>
      </Link>
      <div className="account-nav-kicker-row">
        <div className="account-nav-kicker">NAVIGATE</div>
        {navigatingTo ? <LatticeLoader label="Opening section" status="working" cellSize={4} gap={1} fontSize={9} showTimer={false} /> : null}
      </div>
      <OptionWheel
        items={accountItems.map((item) => item.label)}
        icons={accountItems.map(({ icon: Icon, label }) => <Icon key={label} size={17} strokeWidth={1.7} />)}
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
        onActivate={(index) => {
          const next = accountItems[index];
          if (next) navigate(next.href);
        }}
        className="account-nav-wheel"
      />
      <div className="account-nav-footer">
        <span className="account-nav-footer-dot" aria-hidden="true" />
        <span>ACCOUNT NAVIGATION</span>
      </div>
    </nav>
  );
}
