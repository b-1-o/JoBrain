"use client";

import { useEffect, useRef } from "react";

type DotFieldProps = {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
};

export function DotField({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
}: DotFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;

    const update = (event: PointerEvent) => {
      node.style.setProperty("--dot-x", `${(event.clientX / window.innerWidth) * 100}%`);
      node.style.setProperty("--dot-y", `${(event.clientY / window.innerHeight) * 100}%`);
      node.style.setProperty("--dot-cursor", `${cursorRadius}px`);
      node.style.setProperty("--dot-force", String(cursorForce));
      node.style.setProperty("--dot-bulge", `${bulgeStrength}px`);
      node.style.setProperty("--dot-glow", `${glowRadius}px`);
    };

    window.addEventListener("pointermove", update, { passive: true });
    return () => window.removeEventListener("pointermove", update);
  }, [cursorRadius, cursorForce, bulgeStrength, glowRadius]);

  return (
    <div ref={fieldRef} className="jb-dot-field" aria-hidden="true"
      data-bulge-only={bulgeOnly}
      data-sparkle={sparkle}
      data-wave={waveAmplitude}
      style={{
        "--dot-size": `${dotRadius * 2}px`,
        "--dot-spacing": `${dotSpacing}px`,
      } as React.CSSProperties}
    />
  );
}
