"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import "./OptionWheel.css";

type OptionWheelProps = {
  items: string[];
  defaultSelected?: number;
  onChange?: (index: number, item: string) => void;
  onActivate?: (index: number, item: string) => void;
  onSettled?: (index: number, item: string) => void;
  icons?: ReactNode[];
  textColor?: string;
  activeColor?: string;
  side?: "left" | "right";
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  className?: string;
};

type WheelConfig = {
  count: number;
  items: string[];
  rowH: number;
  curve: number;
  tilt: number;
  blur: number;
  fade: number;
  minOpacity: number;
  side: "left" | "right";
  loop: boolean;
  smoothing: number;
  draggable: boolean;
  soundUrl: string;
  soundVolume: number;
};

export default function OptionWheel({
  items,
  defaultSelected = 0,
  onChange,
  onActivate,
  onSettled,
  icons = [],
  textColor = "#98a5ae",
  activeColor = "#f4f7f8",
  side = "left",
  fontSize = 1.1,
  spacing = 1.5,
  curve = 0.9,
  tilt = 6,
  blur = 1.1,
  fade = 0.2,
  minOpacity = 0.14,
  smoothing = 200,
  inset = 16,
  loop = false,
  draggable = true,
  soundUrl = "",
  soundVolume = 0.3,
  className = "",
}: OptionWheelProps) {
  const initialIndex = Math.max(0, Math.min(defaultSelected, Math.max(0, items.length - 1)));
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const posRef = useRef(initialIndex);
  const targetRef = useRef(initialIndex);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const onActivateRef = useRef(onActivate);
  const onSettledRef = useRef(onSettled);
  const selectedRef = useRef(initialIndex);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ y: number; start: number; id: number } | null>(null);
  const dragMovedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const lastTickRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);

  const cfgRef = useRef<WheelConfig>({
    count: items.length,
    items,
    rowH: Math.max(fontSize * spacing * 16, 1),
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
    soundUrl,
    soundVolume,
  });

  useEffect(() => {
    onChangeRef.current = onChange;
    onActivateRef.current = onActivate;
    onSettledRef.current = onSettled;
    cfgRef.current = {
      count: items.length,
      items,
      rowH: Math.max(fontSize * spacing * 16, 1),
      curve,
      tilt,
      blur,
      fade,
      minOpacity,
      side,
      loop,
      smoothing,
      draggable,
      soundUrl,
      soundVolume,
    };
  }, [items, fontSize, spacing, curve, tilt, blur, fade, minOpacity, side, loop, smoothing, draggable, soundUrl, soundVolume, onChange, onActivate, onSettled]);

  const runFrameRef = useRef<(now: number) => void>(() => undefined);

  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const cfg = cfgRef.current;
    const tau = Math.max(cfg.smoothing, 1) / 1000;
    const progress = 1 - Math.exp(-dt / tau);
    const target = targetRef.current;
    const current = posRef.current;
    let next = current + (target - current) * progress;
    const settled = Math.abs(target - next) < 0.001;
    if (settled) next = target;
    posRef.current = next;

    const mirror = cfg.side === "right" ? -1 : 1;
    const tiltRad = (cfg.tilt * Math.PI) / 180;
    const radius = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0;
    for (let index = 0; index < cfg.count; index += 1) {
      const element = itemRefs.current[index];
      if (!element) continue;
      let distance = index - next;
      if (cfg.loop && cfg.count > 1) {
        distance = ((distance % cfg.count) + cfg.count) % cfg.count;
        if (distance > cfg.count / 2) distance -= cfg.count;
      }
      const magnitude = Math.abs(distance);
      let x = 0;
      let y = distance * cfg.rowH;
      let rotation = 0;
      if (radius > 0) {
        const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distance * tiltRad));
        y = radius * Math.sin(angle);
        x = -mirror * radius * (1 - Math.cos(angle)) * cfg.curve;
        rotation = (mirror * angle * 180) / Math.PI;
      }
      element.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`;
      const opacity = Math.max(cfg.minOpacity, 1 - magnitude * cfg.fade).toFixed(3);
      if (element.style.opacity !== opacity) element.style.opacity = opacity;

      // Preserve the blur depth effect, but avoid sub-pixel filter updates every
      // frame. Filters are paint-heavy; 0.1px quantization is visually seamless.
      const blur = cfg.blur > 0 ? Math.round(magnitude * cfg.blur * 10) / 10 : 0;
      const filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : "none";
      if (element.style.filter !== filter) element.style.filter = filter;

      const progress = Math.max(0, 1 - Math.min(magnitude, 1)).toFixed(3);
      if (element.style.getPropertyValue("--ow-p") !== progress) {
        element.style.setProperty("--ow-p", progress);
      }
    }

    rafRef.current = settled ? null : requestAnimationFrame((timestamp) => runFrameRef.current(timestamp));
  }, []);

  useEffect(() => {
    runFrameRef.current = runFrame;
  }, [runFrame]);

  const startLoop = useCallback(() => {
    // Keep the current frame clock when input updates arrive. Restarting the RAF
    // on every wheel/pointer event creates uneven frame pacing during fast drags.
    if (rafRef.current !== null) return;
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const playTick = useCallback(() => {
    const cfg = cfgRef.current;
    if (!cfg.soundUrl) return;
    const now = performance.now();
    if (now - lastTickRef.current < 70) return;
    lastTickRef.current = now;
    if (!audioRef.current || audioUrlRef.current !== cfg.soundUrl) {
      audioRef.current = new Audio(cfg.soundUrl);
      audioRef.current.preload = "auto";
      audioUrlRef.current = cfg.soundUrl;
    }
    audioRef.current.volume = Math.min(Math.max(cfg.soundVolume, 0), 1);
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => undefined);
  }, []);


  const clearSettledTimer = useCallback(() => {
    if (settledTimerRef.current !== null) {
      clearTimeout(settledTimerRef.current);
      settledTimerRef.current = null;
    }
  }, []);

  const scheduleSettled = useCallback((delay: number) => {
    clearSettledTimer();
    settledTimerRef.current = setTimeout(() => {
      settledTimerRef.current = null;
      const cfg = cfgRef.current;
      const index = selectedRef.current;
      onSettledRef.current?.(index, cfg.items[index] ?? "");
    }, delay);
  }, [clearSettledTimer]);

  const applyTarget = useCallback((value: number, snap: boolean) => {
    const cfg = cfgRef.current;
    if (cfg.count < 1) return;
    let next = value;
    if (!cfg.loop) next = Math.min(Math.max(next, 0), cfg.count - 1);
    if (snap) next = Math.round(next);
    targetRef.current = next;
    const index = ((Math.round(next) % cfg.count) + cfg.count) % cfg.count;
    if (index !== selectedRef.current) {
      selectedRef.current = index;
      setSelectedIndex(index);
      onChangeRef.current?.(index, cfg.items[index] ?? "");
      playTick();
    }
    startLoop();
  }, [playTick, startLoop]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const cfg = cfgRef.current;
      const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
      const step = Math.max(-1, Math.min(1, delta / cfg.rowH));
      clearSettledTimer();
      applyTarget(targetRef.current + step, false);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null;
        applyTarget(targetRef.current, true);
        // Let the wheel finish its snap before changing routes, and cancel this
        // callback if another wheel event arrives during the settling window.
        scheduleSettled(180);
      }, 140);
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      clearSettledTimer();
    };
  }, [applyTarget, clearSettledTimer, scheduleSettled]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!cfgRef.current.draggable || event.button !== 0) return;
    clearSettledTimer();
    dragRef.current = { y: event.clientY, start: targetRef.current, id: event.pointerId };
    dragMovedRef.current = false;
    setIsDragging(true);
  }, [clearSettledTimer]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dy = event.clientY - drag.y;
    if (!dragMovedRef.current && Math.abs(dy) > 4) {
      dragMovedRef.current = true;
      rootRef.current?.setPointerCapture(drag.id);
    }
    if (dragMovedRef.current) applyTarget(drag.start - dy / cfgRef.current.rowH, false);
  }, [applyTarget]);

  const handlePointerEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    if (dragMovedRef.current) {
      applyTarget(targetRef.current, true);
      scheduleSettled(180);
      setTimeout(() => { dragMovedRef.current = false; }, 0);
    }
  }, [applyTarget, scheduleSettled]);

  const handleItemClick = useCallback((index: number) => {
    if (dragMovedRef.current) return;
    clearSettledTimer();
    const cfg = cfgRef.current;
    const current = targetRef.current;
    let distance = index - (((current % cfg.count) + cfg.count) % cfg.count);
    if (cfg.loop && cfg.count > 1) {
      if (distance > cfg.count / 2) distance -= cfg.count;
      else if (distance < -cfg.count / 2) distance += cfg.count;
    }
    applyTarget(current + distance, true);
    onActivateRef.current?.(index, cfg.items[index] ?? "");
  }, [applyTarget, clearSettledTimer]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const cfg = cfgRef.current;
      const index = selectedRef.current;
      onActivateRef.current?.(index, cfg.items[index] ?? "");
      return;
    }
    const delta = event.key === "ArrowUp" || event.key === "ArrowLeft"
      ? -1
      : event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : 0;
    if (!delta) return;
    event.preventDefault();
    clearSettledTimer();
    applyTarget(Math.round(targetRef.current) + delta, true);
    scheduleSettled(120);
  }, [applyTarget, clearSettledTimer, scheduleSettled]);

  useEffect(() => {
    applyTarget(targetRef.current, false);
  }, [items, fontSize, spacing, curve, tilt, blur, fade, minOpacity, side, loop, smoothing, applyTarget]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
    clearSettledTimer();
    audioRef.current?.pause();
  }, [clearSettledTimer]);

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label="Navigation options"
      className={`option-wheel${side === "right" ? " option-wheel--right" : ""}${isDragging ? " option-wheel--dragging" : ""}${className ? ` ${className}` : ""}`}
      style={{
        "--ow-text-color": textColor,
        "--ow-active-color": activeColor,
        "--ow-font-size": `${fontSize}rem`,
        "--ow-inset": `${inset}px`,
      } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      {items.map((label, index) => (
        <div
          key={`${label}-${index}`}
          ref={(element) => { itemRefs.current[index] = element; }}
          role="option"
          aria-selected={selectedIndex === index}
          className={`option-wheel__item${selectedIndex === index ? " option-wheel__item--selected" : ""}`}
          onClick={() => handleItemClick(index)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleItemClick(index);
            }
          }}
        >
          {icons[index] ? <span className="option-wheel__icon" aria-hidden="true">{icons[index]}</span> : null}
          <span className="option-wheel__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
