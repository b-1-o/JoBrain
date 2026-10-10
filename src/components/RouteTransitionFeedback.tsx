"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import LatticeLoader from "@/components/LatticeLoader";

export default function RouteTransitionFeedback() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const timerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const root = document.documentElement;
    // Clear the previous marker so quick consecutive NAVIGATE changes restart
    // the entrance animation instead of inheriting a half-finished transition.
    delete root.dataset.routeTransition;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    const frame = window.requestAnimationFrame(() => {
      if (previousPathname.current !== pathname) return;
      root.dataset.routeTransition = "enter";
      setPending(false);
    });
    transitionTimerRef.current = window.setTimeout(() => {
      delete root.dataset.routeTransition;
      transitionTimerRef.current = null;
    }, 460);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function markPending() {
      setPending(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setPending(false), 2200);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Hash-only jumps do not replace the page and should not flash a loader.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      markPending();
    }

    window.addEventListener("jobrain:navigate-start", markPending);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("jobrain:navigate-start", markPending);
      document.removeEventListener("click", onClick, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      delete document.documentElement.dataset.routeTransition;
    };
  }, []);

  if (!pending) return null;
  return (
    <div className="jb-route-pending" role="status" aria-live="polite">
      <LatticeLoader label="Opening section" doneLabel="Ready" status="working" cellSize={5} gap={2} fontSize={11} showTimer={false} />
    </div>
  );
}
