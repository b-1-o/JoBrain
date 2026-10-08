"use client";

import { useEffect, useState } from "react";
import AccountNav from "@/components/AccountNav";

type Settings = {
  jobAlertsEnabled: boolean;
  searchSuggestionsEnabled: boolean;
  applicationNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  historyTrackingEnabled: boolean;
  theme: string;
};

const labels: Array<[keyof Omit<Settings, "theme">, string, string]> = [
  ["jobAlertsEnabled", "New job suggestions", "Use your searches and tracked roles to prepare new matching opportunities."],
  ["searchSuggestionsEnabled", "Search-based suggestions", "Remember search intent so future suggestions become more relevant."],
  ["applicationNotificationsEnabled", "Application notifications", "Keep important pipeline changes and next actions visible."],
  ["emailNotificationsEnabled", "Email delivery", "Allow JoBrain to send email notifications once mail delivery is configured."],
  ["historyTrackingEnabled", "History tracking", "Remember searches, opened roles and outbound links from JoBrain."],
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    jobAlertsEnabled: false,
    searchSuggestionsEnabled: true,
    applicationNotificationsEnabled: true,
    emailNotificationsEnabled: false,
    historyTrackingEnabled: true,
    theme: "dark",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSettings(data.settings))
      .catch(() => undefined);
  }, []);

  async function save(next: Settings) {
    setSettings(next);
    localStorage.setItem("jobrain-settings", JSON.stringify(next));
    setSaved(false);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaved(response.ok);
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
              Control recommendations, notifications, history and the visual system without touching the workspace itself.
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
                  onClick={() => void save({ ...settings, [key]: !settings[key] })}
                />
              </div>
            ))}
          </section>

          <section className="account-card">
            <h2>Theme</h2>
            <p>Dark and light are the first two presets. Custom visual controls stay attached to your profile.</p>
            <label className="account-field"><span>Theme</span>
              <select value={settings.theme} onChange={(e) => void save({ ...settings, theme: e.target.value })}>
                <option value="dark">Dark graphite</option>
                <option value="light">Light mist</option>
                <option value="system">System</option>
              </select>
            </label>
            {saved ? <p className="account-muted">Saved to your account.</p> : null}
          </section>

          <section className="account-card">
            <h2>Next layer</h2>
            <p>Job alerts can be backed by saved searches. Application notifications can be tied to every status transition and next-action deadline. Both switches are already persisted so the automation layer can be added without changing the product surface.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
