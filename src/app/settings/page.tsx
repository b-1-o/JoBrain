"use client";

import { useCallback, useEffect, useState } from "react";
import AccountNav from "@/components/AccountNav";
import {
  APPEARANCE_PRESETS,
  applyAppearanceToDocument,
  type AppearanceTheme,
} from "@/lib/appearance";

type Settings = {
  jobAlertsEnabled: boolean;
  searchSuggestionsEnabled: boolean;
  applicationNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  historyTrackingEnabled: boolean;
  reducedMotion: boolean;
  theme: string;
};

const labels: Array<[keyof Omit<Settings, "theme" | "reducedMotion">, string, string]> = [
  ["jobAlertsEnabled", "New job suggestions", "Use your searches and tracked roles to prepare new matching opportunities."],
  ["searchSuggestionsEnabled", "Search-based suggestions", "Remember search intent so future suggestions become more relevant."],
  ["applicationNotificationsEnabled", "Application notifications", "Keep important pipeline changes and next actions visible."],
  ["emailNotificationsEnabled", "Email delivery", "Allow JoBrain to send email notifications once mail delivery is configured."],
  ["historyTrackingEnabled", "History tracking", "Remember searches, opened roles and outbound links from JoBrain."],
];

const presetOrder = ["graphite", "mist", "snow", "oled", "frost"] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    jobAlertsEnabled: false,
    searchSuggestionsEnabled: true,
    applicationNotificationsEnabled: true,
    emailNotificationsEnabled: false,
    historyTrackingEnabled: true,
    reducedMotion: false,
    theme: "dark",
  });
  const [saved, setSaved] = useState(false);
  const [presetNote, setPresetNote] = useState("");

  const load = useCallback(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.settings) setSettings({ reducedMotion: false, ...data.settings });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: Settings) {
    setSettings(next);
    localStorage.setItem("jobrain-settings", JSON.stringify(next));
    setSaved(false);

    applyAppearanceToDocument({
      theme: next.theme as AppearanceTheme,
      reducedMotion: next.reducedMotion,
    });

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaved(response.ok);
  }

  function applyPreset(name: (typeof presetOrder)[number]) {
    const preset = APPEARANCE_PRESETS[name];
    applyAppearanceToDocument({
      theme: settings.theme as AppearanceTheme,
      reducedMotion: settings.reducedMotion,
      ...preset,
    });
    setPresetNote(`Applying ${name}…`);
    void fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    }).then(async (response) => {
      if (!response.ok) {
        setPresetNote("Could not save preset.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
      setPresetNote(`${name.charAt(0).toUpperCase() + name.slice(1)} applied.`);
      setSaved(true);
    });
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="settings" />
        <header className="account-head">
          <div>
            <div className="account-kicker">SETTINGS / 02</div>
            <h1 className="account-title">Make JoBrain work for you.</h1>
            <p className="account-copy">
              Control recommendations, notifications, history and the visual system without touching the workspace
              itself.
            </p>
          </div>
        </header>

        <div className="account-grid">
          <section className="account-card account-card-wide">
            <h2>Automation & notifications</h2>
            {labels.map(([key, title, description]) => (
              <div className="account-toggle" key={key}>
                <div>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </div>
                <button
                  type="button"
                  className={"account-switch " + (settings[key] ? "is-on" : "")}
                  aria-pressed={settings[key]}
                  aria-label={title}
                  onClick={() => void save({ ...settings, [key]: !settings[key] })}
                />
              </div>
            ))}
          </section>

          <section className="account-card">
            <h2>Appearance</h2>
            <p>Theme and motion preferences apply globally through shared CSS tokens.</p>
            <label className="account-field">
              <span>Theme</span>
              <select
                value={settings.theme}
                onChange={(e) => void save({ ...settings, theme: e.target.value })}
                aria-label="Theme"
              >
                <option value="dark">Dark graphite</option>
                <option value="light">Light mist</option>
                <option value="system">System</option>
              </select>
            </label>
            <div className="account-toggle">
              <div>
                <strong>Reduced motion</strong>
                <small>Limit ambient animation when you prefer a calmer interface.</small>
              </div>
              <button
                type="button"
                className={"account-switch " + (settings.reducedMotion ? "is-on" : "")}
                aria-pressed={settings.reducedMotion}
                aria-label="Reduced motion"
                onClick={() => void save({ ...settings, reducedMotion: !settings.reducedMotion })}
              />
            </div>
            <div className="account-field">
              <span>Presets</span>
              <div className="account-actions" style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
                {presetOrder.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="account-button"
                    onClick={() => applyPreset(name)}
                  >
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {presetNote ? <p className="account-muted">{presetNote}</p> : null}
            {saved ? <p className="account-muted">Saved to your account.</p> : null}
          </section>

          <section className="account-card">
            <h2>Fine-tune on Profile</h2>
            <p>
              Accent color, glass intensity, blur, panel opacity, border intensity, avatar, banner and background are
              edited on the Profile page so identity and visuals stay in one place.
            </p>
            <a className="account-button" href="/profile">
              Open profile editor →
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
