"use client";

import { useEffect, useRef } from "react";

type ColorBendsProps = {
  color?: string;
  speed?: number;
  frequency?: number;
  noise?: number;
  bandWidth?: number;
  rotation?: number;
  fadeTop?: number;
  iterations?: number;
  intensity?: number;
};

function hexToRgb(value: string) {
  const hex = value.replace("#", "").trim();
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;

  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

export function ColorBends({
  color = "#ffffff",
  speed = 0.2,
  frequency = 1,
  noise = 0.15,
  bandWidth = 0.14,
  rotation = 90,
  fadeTop = 0.75,
  iterations = 1,
  intensity = 1.3,
}: ColorBendsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const startedAt = performance.now();
    const rgb = hexToRgb(color);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#ffffff");
      background.addColorStop(0.44, "#f1f3f4");
      background.addColorStop(1, "#d9dee1");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const time = elapsed * speed;
      const count = Math.max(1, Math.round(iterations) + 2);
      const amplitude = Math.min(height * 0.17, 145 + bandWidth * height * 0.38);
      const strokeWidth = Math.max(52, height * (0.035 + bandWidth * 0.13));

      context.save();
      context.translate(width / 2, height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.translate(-width / 2, -height / 2);

      for (let pass = 0; pass < count; pass += 1) {
        const vertical = height * (0.18 + (pass / Math.max(1, count - 1)) * 0.74);
        const phase = time * (1.7 + pass * 0.14) + pass * 1.8;
        const localAmplitude = amplitude * (0.68 + pass * 0.08);
        const alpha = Math.min(0.23, 0.065 * intensity + pass * 0.014);

        context.beginPath();

        for (let x = -width * 0.08; x <= width * 1.08; x += 16) {
          const normalized = x / width;
          const wave =
            Math.sin(normalized * Math.PI * 2 * frequency + phase) +
            Math.sin(normalized * Math.PI * 4.5 + phase * 0.53) * noise;
          const y = vertical + wave * localAmplitude;

          if (x === -width * 0.08) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        const bend = context.createLinearGradient(0, vertical - amplitude, width, vertical + amplitude);
        bend.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        bend.addColorStop(0.18, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
        bend.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(0.34, alpha * 2.8)})`);
        bend.addColorStop(0.82, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
        bend.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);

        context.strokeStyle = bend;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = strokeWidth;
        context.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`;
        context.shadowBlur = 48;
        context.stroke();

        context.lineWidth = strokeWidth * 0.42;
        context.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(0.15, alpha * 1.35)})`;
        context.shadowBlur = 24;
        context.stroke();
      }

      context.restore();

      const fade = context.createLinearGradient(0, 0, 0, height);
      fade.addColorStop(0, `rgba(255,255,255,${Math.min(0.94, fadeTop)})`);
      fade.addColorStop(0.22, `rgba(255,255,255,${Math.min(0.34, fadeTop * 0.46)})`);
      fade.addColorStop(0.68, "rgba(255,255,255,0.01)");
      fade.addColorStop(1, "rgba(212,218,221,0.08)");
      context.fillStyle = fade;
      context.fillRect(0, 0, width, height);

      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    draw(startedAt);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [bandWidth, color, fadeTop, frequency, intensity, iterations, noise, rotation, speed]);

  return <canvas ref={canvasRef} className="jb-color-bends" aria-hidden="true" />;
}
