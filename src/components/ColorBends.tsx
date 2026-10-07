"use client";

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
  return (
    <div className="jb-color-bends" aria-hidden="true"
      style={{
        "--cb-color": color,
        "--cb-speed": `${speed}s`,
        "--cb-frequency": frequency,
        "--cb-noise": noise,
        "--cb-band": bandWidth,
        "--cb-rotation": `${rotation}deg`,
        "--cb-fade": fadeTop,
        "--cb-iterations": iterations,
        "--cb-intensity": intensity,
      } as React.CSSProperties}
    >
      <span className="jb-color-bend jb-color-bend-a" />
      <span className="jb-color-bend jb-color-bend-b" />
      <span className="jb-color-bend jb-color-bend-c" />
      <span className="jb-color-bend jb-color-bend-d" />
    </div>
  );
}
