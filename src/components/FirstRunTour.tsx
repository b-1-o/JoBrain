"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type WorkspaceTab = "overview" | "search" | "pipeline";
type Step = {
  tab: WorkspaceTab;
  target: string;
  eyebrow: string;
  title: string;
  description: string;
};

type Rect = { x: number; y: number; width: number; height: number };
type Viewport = { width: number; height: number };
type Position = { x: number; y: number; width: number };

const STORAGE_KEY = "jobrain-first-run-tour-v1";

const STEPS: Step[] = [
  {
    tab: "overview",
    target: '[data-tour="hero-actions"]',
    eyebrow: "YOUR WORKSPACE",
    title: "Welcome to JoBrain",
    description:
      "One calm place to find relevant roles, keep applications organized, and see what to do next. This quick tour shows you the essentials.",
  },
  {
    tab: "search",
    target: '[data-tour="search-panel"]',
    eyebrow: "01 / DISCOVER",
    title: "Find your next role",
    description:
      "Search by title, skill, or company. Narrow results by location, source, experience level, and remote work. Use “For you” for personalized suggestions.",
  },
  {
    tab: "pipeline",
    target: '[data-tour="pipeline-stage"]',
    eyebrow: "02 / STAY ON TRACK",
    title: "Keep applications moving",
    description:
      "Track each opportunity from Found through interviews and offers. Add a role manually when you found it somewhere else, then keep its status up to date.",
  },
  {
    tab: "pipeline",
    target: '[data-tour="account-shortcuts"]',
    eyebrow: "03 / MAKE IT YOURS",
    title: "Your profile and settings",
    description:
      "Complete your professional profile, adjust preferences, personalize the workspace background, and manage the parts of JoBrain that fit your workflow.",
  },
  {
    tab: "pipeline",
    target: '[data-tour="theme-toggle"]',
    eyebrow: "04 / YOUR PREFERENCES",
    title: "Choose your look",
    description:
      "Switch between light and dark themes at any time. Your workspace keeps the same familiar layout while the surfaces and green accent adapt to the theme.",
  },
];

export default function FirstRunTour({
  activeTab,
  onNavigate,
}: {
  activeTab: WorkspaceTab;
  onNavigate: (tab: WorkspaceTab) => void;
}) {
  const maskId = useId().replaceAll(":", "");
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [position, setPosition] = useState<Position>({ x: 16, y: 16, width: 360 });

  const step = STEPS[stepIndex]!;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setOpen(window.localStorage.getItem(STORAGE_KEY) !== "complete");
      } catch {
        setOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (activeTab !== step.tab) onNavigate(step.tab);

    let timeout = 0;
    const measureTarget = (scrollToTarget = false) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );

      const target = document.querySelector<HTMLElement>(step.target);
      if (!target) {
        setSpotlight((current) => (current === null ? current : null));
        return;
      }

      if (scrollToTarget) {
        target.scrollIntoView({
          behavior:
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            document.documentElement.dataset.reducedMotion === "true"
              ? "auto"
              : "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }

      const bounds = target.getBoundingClientRect();
      const padding = 7;
      const rect = {
        x: Math.max(6, bounds.left - padding),
        y: Math.max(6, bounds.top - padding),
        width: Math.min(width - 12, bounds.width + padding * 2),
        height: Math.min(height - 12, bounds.height + padding * 2),
      };
      setSpotlight((current) => {
        if (
          current &&
          Math.abs(current.x - rect.x) < 1 &&
          Math.abs(current.y - rect.y) < 1 &&
          Math.abs(current.width - rect.width) < 1 &&
          Math.abs(current.height - rect.height) < 1
        ) {
          return current;
        }
        return rect;
      });

      const cardWidth = Math.min(380, width - 32);
      const estimatedCardHeight = width <= 640 ? 270 : 245;
      const x = Math.min(
        Math.max(16, bounds.left + bounds.width / 2 - cardWidth / 2),
        Math.max(16, width - cardWidth - 16),
      );
      let y = bounds.bottom + 18;
      if (y + estimatedCardHeight > height - 16) {
        y = bounds.top - estimatedCardHeight - 18;
      }
      y = Math.min(Math.max(16, y), Math.max(16, height - estimatedCardHeight - 16));

      setPosition((current) =>
        Math.abs(current.x - x) < 1 &&
        Math.abs(current.y - y) < 1 &&
        current.width === cardWidth
          ? current
          : { x, y, width: cardWidth },
      );
    };

    timeout = window.setTimeout(() => measureTarget(true), activeTab === step.tab ? 40 : 120);
    const onViewportChange = () => measureTarget();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [activeTab, onNavigate, open, step]);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "complete");
    } catch {
      // The tour can still be dismissed when storage is unavailable.
    }
    setClosing(true);
    window.setTimeout(() => setOpen(false), 180);
  }, []);

  const next = useCallback(() => {
    if (stepIndex === STEPS.length - 1) {
      finish();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    onNavigate(STEPS[nextIndex]!.tab);
  }, [finish, onNavigate, stepIndex]);

  const previous = useCallback(() => {
    if (stepIndex === 0) return;
    const previousIndex = stepIndex - 1;
    setStepIndex(previousIndex);
    onNavigate(STEPS[previousIndex]!.tab);
  }, [onNavigate, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, next, open, previous]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={"jb-tour-layer" + (closing ? " is-closing" : "")}>
      {viewport.width > 0 && viewport.height > 0 ? (
        <svg
          className="jb-tour-dimmer"
          width={viewport.width}
          height={viewport.height}
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect width={viewport.width} height={viewport.height} fill="white" />
              {spotlight ? (
                <rect
                  x={spotlight.x}
                  y={spotlight.y}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx="14"
                  fill="black"
                />
              ) : null}
            </mask>
          </defs>
          <rect
            width={viewport.width}
            height={viewport.height}
            fill="rgba(1, 5, 2, 0.76)"
            mask={`url(#${maskId})`}
          />
        </svg>
      ) : null}

      {spotlight ? (
        <div
          className="jb-tour-spotlight"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden="true"
        />
      ) : null}

      <section
        className="jb-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jb-tour-title"
        aria-describedby="jb-tour-description"
        style={{ left: position.x, top: position.y, width: position.width }}
      >
        <div className="jb-tour-card-top">
          <span className="jb-tour-eyebrow">{step.eyebrow}</span>
          <button type="button" className="jb-tour-skip" onClick={finish}>
            Skip tour
          </button>
        </div>

        <div className="jb-tour-progress" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span
              key={item.eyebrow}
              className={index <= stepIndex ? "is-complete" : ""}
            />
          ))}
        </div>

        <h2 id="jb-tour-title">{step.title}</h2>
        <p id="jb-tour-description">{step.description}</p>

        <div className="jb-tour-actions">
          <span className="jb-tour-step-count">
            {String(stepIndex + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <div className="jb-tour-buttons">
            {stepIndex > 0 ? (
              <button type="button" className="jb-tour-back" onClick={previous}>
                Back
              </button>
            ) : null}
            <button type="button" className="jb-tour-next" onClick={next}>
              {stepIndex === STEPS.length - 1 ? "Got it" : "Next"}
              {stepIndex === STEPS.length - 1 ? null : <span aria-hidden="true">→</span>}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
