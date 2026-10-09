"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import "./LatticeLoader.css";

type LoaderStatus = "working" | "done" | "error";
type GridSize = 3 | 4;
type PatternShape = {
  cells: Array<number | null>;
  loop?: number;
  scale?: number;
  lit?: number;
};
type PatternName = "arrow" | "dots" | "ripple" | "spiral" | "orbit" | "snake" | "sweep" | "spin" | "rain" | "pulse";

const PATTERNS: Record<PatternName, Partial<Record<GridSize, PatternShape>>> = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 },
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 },
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } },
};

const DEFAULT_PATTERN: Record<GridSize, PatternName> = { 3: "orbit", 4: "sweep" };
const MARKS: Record<GridSize, Record<Exclude<LoaderStatus, "working">, number[]>> = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
};

function resolvePattern(pattern: PatternName | PatternShape, grid: GridSize): Required<PatternShape> {
  if (typeof pattern === "string") {
    const selected = PATTERNS[pattern][grid] ?? PATTERNS[DEFAULT_PATTERN[grid]][grid];
    return {
      cells: selected?.cells ?? Array.from({ length: grid * grid }, (_, index) => index),
      loop: selected?.loop ?? grid * grid,
      scale: selected?.scale ?? 1,
      lit: selected?.lit ?? 0.62,
    };
  }
  const cells = Array.from({ length: grid * grid }, (_, index) => pattern.cells[index] ?? null);
  const max = Math.max(0, ...cells.filter((value): value is number => value !== null));
  return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 };
}

function formatDs(ds: number): string {
  return ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;
}
function spokenDs(ds: number): string {
  return ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;
}

type LatticeLoaderProps = {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  status?: LoaderStatus;
  pattern?: PatternName | PatternShape;
  grid?: GridSize;
  shape?: "square" | "round";
  color?: string;
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
  elapsed?: number;
  className?: string;
  style?: CSSProperties;
};

export default function LatticeLoader({
  label = "Saving",
  doneLabel = "Saved",
  errorLabel = "Failed",
  status = "working",
  pattern = "orbit",
  grid = 3,
  shape = "round",
  color = "currentColor",
  doneColor = "#8cc9b4",
  errorColor = "#e58c91",
  cellSize = 5,
  gap = 2,
  fontSize = 12,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = "",
  showTimer = false,
  elapsed,
  className = "",
  style,
}: LatticeLoaderProps) {
  const count: GridSize = grid === 4 ? 4 : 3;
  const resolved = resolvePattern(pattern, count);
  const markSet = MARKS[count];
  const durationStep = step * resolved.scale;
  const cycle = Math.round(resolved.loop * durationStep);
  const timerRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef(0);
  const mark: Exclude<LoaderStatus, "working"> = status === "error" ? "error" : "done";
  const [announce, setAnnounce] = useState(`${label}, in progress`);

  const paint = (deciseconds: number) => {
    elapsedRef.current = deciseconds;
    if (timerRef.current) timerRef.current.textContent = formatDs(deciseconds);
  };

  useLayoutEffect(() => {
    if (elapsed !== undefined) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (status !== "working") return undefined;
    const startedAt = performance.now();
    paint(0);
    const intervalId = window.setInterval(() => {
      paint(Math.floor((performance.now() - startedAt) / 100));
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [status, elapsed]);

  useEffect(() => {
    const next = status === "working"
      ? `${label}, in progress`
      : `${status === "done" ? doneLabel : errorLabel}${showTimer ? ` ${spokenDs(elapsedRef.current)}` : ""}`;
    setAnnounce(next);
  }, [status, label, doneLabel, errorLabel, showTimer]);

  return (
    <span
      role="status"
      className={`lattice-loader${className ? ` ${className}` : ""}`}
      data-status={status}
      data-shape={shape}
      data-glow={glow ? "" : undefined}
      style={{
        "--ll-n": count,
        "--ll-cell": `${cellSize}px`,
        "--ll-gap": `${gap}px`,
        "--ll-font": `${fontSize}px`,
        "--ll-color": color,
        "--ll-mark": status === "error" ? errorColor : doneColor,
        "--ll-idle": idleOpacity,
        "--ll-glow": glowColor || color,
        "--ll-mark-glow": glowColor || (status === "error" ? errorColor : doneColor),
        "--ll-cycle": `${cycle}ms`,
        ...style,
      } as CSSProperties}
    >
      <span className="lattice-loader__grid" aria-hidden="true">
        <span className="lattice-loader__layer lattice-loader__run">
          {resolved.cells.map((unit, index) => (
            <span
              key={index}
              className="lattice-loader__cell"
              data-hole={unit === null ? "" : undefined}
              data-lit={resolved.lit !== 0.62 ? Math.round(resolved.lit * 100) : undefined}
              style={unit === null ? undefined : { animationDelay: `${Math.round(unit * durationStep)}ms` }}
            />
          ))}
        </span>
        <span className="lattice-loader__layer lattice-loader__mark">
          {resolved.cells.map((_, index) => (
            <span key={index} className="lattice-loader__cell" data-on={markSet[mark].includes(index) ? "" : undefined} />
          ))}
        </span>
      </span>
      <span className="lattice-loader__label" aria-hidden="true">
        <span className="lattice-loader__text" data-active={status === "working" ? "" : undefined}>{label}</span>
        <span className="lattice-loader__text" data-active={status === "done" ? "" : undefined}>{doneLabel}</span>
        <span className="lattice-loader__text" data-active={status === "error" ? "" : undefined}>{errorLabel}</span>
      </span>
      {showTimer ? <span ref={timerRef} className="lattice-loader__timer" aria-hidden="true">0.0s</span> : null}
      <span className="lattice-loader__sr">{announce}</span>
    </span>
  );
}
