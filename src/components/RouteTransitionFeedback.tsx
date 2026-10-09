"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import LatticeLoader from "@/components/LatticeLoader";

export default function RouteTransitionFeedback() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const timerRef = useRef<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      window.requestAnimationFrame(() => setPending(false));
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function markPending() {
      setPending(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setPending(false), 2200);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      markPending();
    }

    window.addEventListener("jobrain:navigate-start", markPending);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("jobrain:navigate-start", markPending);
      document.removeEventListener("click", onClick, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!pending) return null;
  return (
    <div className="jb-route-pending" role="status" aria-live="polite">
      <LatticeLoader label="Opening section" doneLabel="Ready" status="working" cellSize={5} gap={2} fontSize={11} showTimer={false} />
    </div>
  );
}
