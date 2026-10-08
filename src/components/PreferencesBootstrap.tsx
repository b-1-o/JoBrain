"use client";

import { useEffect } from "react";

type Profile = {
  backgroundUrl?: string | null;
  accentColor?: string | null;
  glassIntensity?: number | null;
};

type Settings = {
  theme?: string | null;
};

export default function PreferencesBootstrap() {
  useEffect(() => {
    const apply = (profile?: Profile, settings?: Settings) => {
      const root = document.documentElement;
      const theme =
        settings?.theme === "light" || settings?.theme === "dark"
          ? settings.theme
          : localStorage.getItem("jobrain-theme") === "light"
            ? "light"
            : "dark";

      root.dataset.theme = theme;
      localStorage.setItem("jobrain-theme", theme);

      if (profile?.accentColor) {
        root.style.setProperty("--jb-user-accent", profile.accentColor);
      }

      const intensity = Math.min(80, Math.max(0, profile?.glassIntensity ?? 45));
      root.style.setProperty("--jb-glass-alpha", String(0.16 + intensity / 500));

      if (profile?.backgroundUrl) {
        root.style.setProperty("--jb-user-background", `url("${profile.backgroundUrl}")`);
        root.dataset.customBackground = "true";
      } else {
        root.style.removeProperty("--jb-user-background");
        delete root.dataset.customBackground;
      }
    };

    const cachedProfile = localStorage.getItem("jobrain-profile");
    const cachedSettings = localStorage.getItem("jobrain-settings");
    try {
      apply(
        cachedProfile ? (JSON.parse(cachedProfile) as Profile) : undefined,
        cachedSettings ? (JSON.parse(cachedSettings) as Settings) : undefined,
      );
    } catch {
      apply();
    }

    void Promise.all([
      fetch("/api/profile", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([profileData, settingsData]) => {
      const profile = profileData?.profile as Profile | undefined;
      const settings = settingsData?.settings as Settings | undefined;
      if (profile) localStorage.setItem("jobrain-profile", JSON.stringify(profile));
      if (settings) localStorage.setItem("jobrain-settings", JSON.stringify(settings));
      apply(profile, settings);
    }).catch(() => {
      // Signed-out users keep the local theme without an authenticated profile.
    });
  }, []);

  return null;
}
