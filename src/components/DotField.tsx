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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      pointerRef.current = { x: targetX, y: targetY };
    };

    const draw = () => {
      currentX += (targetX - currentX) * 0.11;
      currentY += (targetY - currentY) * 0.11;

      context.clearRect(0, 0, width, height);

      const startX = dotSpacing * 0.5;
      const startY = dotSpacing * 0.5;

      for (let y = startY; y < height; y += dotSpacing) {
        for (let x = startX; x < width; x += dotSpacing) {
          const dx = x - currentX;
          const dy = y - currentY;
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / cursorRadius);
          const eased = influence * influence;

          let renderX = x;
          let renderY = y;

          if (influence > 0) {
            const directionX = distance > 0 ? dx / distance : 0;
            const directionY = distance > 0 ? dy / distance : 0;
            const displacement = bulgeOnly
              ? bulgeStrength * eased * (0.48 + cursorForce)
              : bulgeStrength * eased * cursorForce;

            renderX += directionX * displacement;
            renderY += directionY * displacement;
          }

          const radius = dotRadius * (1 + eased * 1.65);
          const alpha = 0.10 + eased * 0.34;

          context.beginPath();
          context.fillStyle = `rgba(43,53,59,${alpha})`;
          context.arc(renderX, renderY, radius, 0, Math.PI * 2);
          context.fill();

          if (sparkle && eased > 0.72) {
            context.fillStyle = `rgba(255,255,255,${eased * 0.3})`;
            context.beginPath();
            context.arc(renderX, renderY, radius * 0.45, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      if (currentX > -500) {
        const glow = context.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          glowRadius,
        );
        glow.addColorStop(0, "rgba(255,255,255,0.42)");
        glow.addColorStop(0.35, "rgba(255,255,255,0.13)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = glow;
        context.fillRect(
          currentX - glowRadius,
          currentY - glowRadius,
          glowRadius * 2,
          glowRadius * 2,
        );
      }

      if (waveAmplitude !== 0) {
        // Reserved parameter: keeping the API compatible with the visual preset.
      }

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(animationFrame);
    };
  }, [bulgeOnly, bulgeStrength, cursorForce, cursorRadius, dotRadius, dotSpacing, glowRadius, sparkle, waveAmplitude]);

  return <canvas ref={canvasRef} className="jb-dot-field" aria-hidden="true" />;
}
