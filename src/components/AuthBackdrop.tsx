"use client";

import { useEffect, useState } from "react";
import PatternWaves from "@components/PatternWaves";

type Theme = "dark" | "light";

export default function AuthBackdrop() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasCustomBackground, setHasCustomBackground] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setTheme(root.dataset.theme === "light" ? "light" : "dark");
      setReducedMotion(root.dataset.reducedMotion === "true" || motion.matches);
      setHasCustomBackground(root.dataset.customBackground === "true");
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-reduced-motion", "data-custom-background"],
    });
    motion.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
    };
  }, []);

  if (hasCustomBackground) return null;

  const isLight = theme === "light";

  return (
    <PatternWaves
      preset="silk"
      color={isLight ? "#000000" : "#ffffff"}
      backgroundColor={isLight ? "#d0d0d0" : "#000000"}
      fade="edges"
      interactive={!reducedMotion}
      cursorSize={50}
      cursorStrength={0.6}
      shine={0.15}
      speed={0}
      opacity={1}
      paused={reducedMotion}
      className="jb-auth-pattern"
    />
  );
}
