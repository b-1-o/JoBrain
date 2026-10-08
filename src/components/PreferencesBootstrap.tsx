"use client";

import { useEffect } from "react";
import {
  applyAppearanceToDocument,
  normalizeAppearance,
  readCachedAppearance,
  type AppearanceState,
} from "@/lib/appearance";

type Profile = {
  backgroundUrl?: string | null;
  accentColor?: string | null;
  glassIntensity?: number | null;
  glassBlur?: number | null;
  panelOpacity?: number | null;
  borderIntensity?: number | null;
};

type Settings = {
  theme?: string | null;
  reducedMotion?: boolean | null;
};

function mergeAppearance(profile?: Profile, settings?: Settings): AppearanceState {
  return normalizeAppearance({
    theme:
      settings?.theme === "light" || settings?.theme === "dark" || settings?.theme === "system"
        ? settings.theme
        : undefined,
    accentColor: profile?.accentColor ?? undefined,
    glassIntensity: profile?.glassIntensity ?? undefined,
    glassBlur: profile?.glassBlur ?? undefined,
    panelOpacity: profile?.panelOpacity ?? undefined,
    borderIntensity: profile?.borderIntensity ?? undefined,
    backgroundUrl: profile?.backgroundUrl ?? null,
    reducedMotion: settings?.reducedMotion ?? false,
  });
}

export default function PreferencesBootstrap() {
  useEffect(() => {
    applyAppearanceToDocument(readCachedAppearance());

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.dataset.reducedMotion = "true";
    }

    void Promise.all([
      fetch("/api/profile", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, settingsData]) => {
        const profile = profileData?.profile as Profile | undefined;
        const settings = settingsData?.settings as Settings | undefined;
        if (profile) localStorage.setItem("jobrain-profile", JSON.stringify(profile));
        if (settings) localStorage.setItem("jobrain-settings", JSON.stringify(settings));
        applyAppearanceToDocument(mergeAppearance(profile, settings));
      })
      .catch(() => {
        // Signed-out users keep the local theme without an authenticated profile.
      });
  }, []);

  return null;
}
