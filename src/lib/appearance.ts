/**
 * Single source of truth for JoBrain visual tokens.
 * Applied via CSS custom properties to avoid layout-wide React re-renders.
 */

export type AppearanceTheme = "dark" | "light" | "system";

export type AppearanceState = {
  theme: AppearanceTheme;
  accentColor: string;
  glassIntensity: number;
  glassBlur: number;
  panelOpacity: number;
  borderIntensity: number;
  backgroundUrl: string | null;
  reducedMotion: boolean;
};

export const APPEARANCE_DEFAULTS: AppearanceState = {
  theme: "dark",
  accentColor: "#b8c9d6",
  glassIntensity: 45,
  glassBlur: 12,
  panelOpacity: 72,
  borderIntensity: 40,
  backgroundUrl: null,
  reducedMotion: false,
};

export const APPEARANCE_PRESETS: Record<
  string,
  Pick<AppearanceState, "accentColor" | "glassIntensity" | "glassBlur" | "panelOpacity" | "borderIntensity">
> = {
  graphite: {
    accentColor: "#b8c9d6",
    glassIntensity: 45,
    glassBlur: 12,
    panelOpacity: 72,
    borderIntensity: 40,
  },
  mist: {
    accentColor: "#9eb6c8",
    glassIntensity: 55,
    glassBlur: 16,
    panelOpacity: 64,
    borderIntensity: 32,
  },
  snow: {
    accentColor: "#6b8a9e",
    glassIntensity: 35,
    glassBlur: 10,
    panelOpacity: 80,
    borderIntensity: 28,
  },
  oled: {
    accentColor: "#d0dce6",
    glassIntensity: 28,
    glassBlur: 8,
    panelOpacity: 88,
    borderIntensity: 50,
  },
  frost: {
    accentColor: "#a8c4d8",
    glassIntensity: 62,
    glassBlur: 18,
    panelOpacity: 58,
    borderIntensity: 36,
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAppearance(input: Partial<AppearanceState> | null | undefined): AppearanceState {
  const theme =
    input?.theme === "light" || input?.theme === "dark" || input?.theme === "system"
      ? input.theme
      : APPEARANCE_DEFAULTS.theme;

  const accent =
    typeof input?.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.accentColor)
      ? input.accentColor
      : APPEARANCE_DEFAULTS.accentColor;

  return {
    theme,
    accentColor: accent,
    glassIntensity: clamp(Math.round(input?.glassIntensity ?? APPEARANCE_DEFAULTS.glassIntensity), 0, 80),
    glassBlur: clamp(Math.round(input?.glassBlur ?? APPEARANCE_DEFAULTS.glassBlur), 0, 24),
    panelOpacity: clamp(Math.round(input?.panelOpacity ?? APPEARANCE_DEFAULTS.panelOpacity), 40, 95),
    borderIntensity: clamp(Math.round(input?.borderIntensity ?? APPEARANCE_DEFAULTS.borderIntensity), 0, 100),
    backgroundUrl: input?.backgroundUrl?.trim() ? input.backgroundUrl.trim().slice(0, 2048) : null,
    reducedMotion: Boolean(input?.reducedMotion),
  };
}

export function resolveTheme(theme: AppearanceTheme): "dark" | "light" {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return theme === "light" ? "light" : "dark";
}

/** Apply appearance tokens to documentElement without React re-renders. */
export function applyAppearanceToDocument(raw: Partial<AppearanceState> | null | undefined): AppearanceState {
  const appearance = normalizeAppearance(raw);
  if (typeof document === "undefined") return appearance;

  const root = document.documentElement;
  const resolved = resolveTheme(appearance.theme);
  root.dataset.theme = resolved;
  root.dataset.reducedMotion = appearance.reducedMotion ? "true" : "false";

  root.style.setProperty("--jb-user-accent", appearance.accentColor);
  root.style.setProperty("--jb-glass-alpha", String((appearance.glassIntensity / 80) * 0.28));
  root.style.setProperty("--jb-glass-blur", `${appearance.glassBlur}px`);
  root.style.setProperty("--jb-panel-opacity", String(appearance.panelOpacity / 100));
  root.style.setProperty("--jb-border-intensity", String(appearance.borderIntensity / 100));

  if (appearance.backgroundUrl) {
    const safe = appearance.backgroundUrl.replace(/["\\]/g, "");
    root.style.setProperty("--jb-user-background", `url("${safe}")`);
    root.dataset.customBackground = "true";
  } else {
    root.style.removeProperty("--jb-user-background");
    delete root.dataset.customBackground;
  }

  try {
    localStorage.setItem("jobrain-theme", resolved);
    localStorage.setItem("jobrain-appearance", JSON.stringify(appearance));
  } catch {
    // ignore quota / private mode
  }

  return appearance;
}

export function readCachedAppearance(): AppearanceState {
  if (typeof window === "undefined") return APPEARANCE_DEFAULTS;
  try {
    const cached = localStorage.getItem("jobrain-appearance");
    if (cached) return normalizeAppearance(JSON.parse(cached) as Partial<AppearanceState>);
  } catch {
    // fall through
  }
  const theme = localStorage.getItem("jobrain-theme");
  return normalizeAppearance({
    theme: theme === "light" || theme === "dark" ? theme : "dark",
  });
}
