"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import AccountNav from "@/components/AccountNav";
import LatticeLoader from "@/components/LatticeLoader";
import OptionWheel from "@/components/OptionWheel";
import {
  APPEARANCE_PRESETS,
  applyAppearanceToDocument,
  readCachedAppearance,
  type AppearanceTheme,
} from "@/lib/appearance";
import { MEDIA_LIMITS, sanitizeImageUrl, type MediaKind } from "@/lib/media";

type Settings = {
  jobAlertsEnabled: boolean;
  searchSuggestionsEnabled: boolean;
  applicationNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  historyTrackingEnabled: boolean;
  reducedMotion: boolean;
  theme: "dark" | "light" | "system";
};

type Profile = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  backgroundUrl: string;
  accentColor: string;
  glassIntensity: number;
  glassBlur: number;
  panelOpacity: number;
  borderIntensity: number;
};

type Activity = "idle" | "working" | "done" | "error";
type SettingsSection = "Preferences" | "Media studio" | "Appearance";
type ToggleKey =
  | "jobAlertsEnabled"
  | "searchSuggestionsEnabled"
  | "applicationNotificationsEnabled"
  | "emailNotificationsEnabled"
  | "historyTrackingEnabled";

const emptySettings: Settings = {
  jobAlertsEnabled: false,
  searchSuggestionsEnabled: true,
  applicationNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  historyTrackingEnabled: true,
  reducedMotion: false,
  theme: "dark",
};

const emptyProfile: Profile = {
  displayName: "",
  bio: "",
  avatarUrl: "",
  bannerUrl: "",
  backgroundUrl: "",
  accentColor: "#b8c9d6",
  glassIntensity: 45,
  glassBlur: 12,
  panelOpacity: 72,
  borderIntensity: 40,
};

const preferenceItems: Array<{ key: ToggleKey; title: string; description: string; icon: typeof Bell }> = [
  {
    key: "jobAlertsEnabled",
    title: "New job suggestions",
    description: "Prepare matching opportunities from your saved searches and tracked roles.",
    icon: Sparkles,
  },
  {
    key: "searchSuggestionsEnabled",
    title: "Search-based suggestions",
    description: "Use your previous searches to make recommendations more relevant.",
    icon: SlidersHorizontal,
  },
  {
    key: "applicationNotificationsEnabled",
    title: "Application notifications",
    description: "Keep pipeline changes and next actions visible.",
    icon: Bell,
  },
  {
    key: "emailNotificationsEnabled",
    title: "Email delivery",
    description: "Allow email notifications when delivery is configured.",
    icon: UploadCloud,
  },
  {
    key: "historyTrackingEnabled",
    title: "History tracking",
    description: "Remember searches, opened roles and outbound links.",
    icon: FolderOpen,
  },
];

const settingsSections: Array<{ label: SettingsSection; icon: typeof SlidersHorizontal }> = [
  { label: "Preferences", icon: SlidersHorizontal },
  { label: "Media studio", icon: ImageIcon },
  { label: "Appearance", icon: Palette },
];

const mediaFields: Record<MediaKind, "avatarUrl" | "bannerUrl" | "backgroundUrl"> = {
  avatar: "avatarUrl",
  banner: "bannerUrl",
  background: "backgroundUrl",
};

const mediaLabels: Record<MediaKind, string> = {
  avatar: "Avatar",
  banner: "Banner",
  background: "Page background",
};

const presetOrder = ["graphite", "mist", "snow", "oled", "frost"] as const;

function fromProfile(raw: Record<string, unknown> | null | undefined): Profile {
  return {
    displayName: typeof raw?.displayName === "string" ? raw.displayName : "",
    bio: typeof raw?.bio === "string" ? raw.bio : "",
    avatarUrl: typeof raw?.avatarUrl === "string" ? raw.avatarUrl : "",
    bannerUrl: typeof raw?.bannerUrl === "string" ? raw.bannerUrl : "",
    backgroundUrl: typeof raw?.backgroundUrl === "string" ? raw.backgroundUrl : "",
    accentColor: typeof raw?.accentColor === "string" ? raw.accentColor : "#b8c9d6",
    glassIntensity: typeof raw?.glassIntensity === "number" ? raw.glassIntensity : 45,
    glassBlur: typeof raw?.glassBlur === "number" ? raw.glassBlur : 12,
    panelOpacity: typeof raw?.panelOpacity === "number" ? raw.panelOpacity : 72,
    borderIntensity: typeof raw?.borderIntensity === "number" ? raw.borderIntensity : 40,
  };
}

function fromSettings(raw: Record<string, unknown> | null | undefined): Settings {
  const theme = raw?.theme === "light" || raw?.theme === "system" ? raw.theme : "dark";
  return {
    jobAlertsEnabled: typeof raw?.jobAlertsEnabled === "boolean" ? raw.jobAlertsEnabled : emptySettings.jobAlertsEnabled,
    searchSuggestionsEnabled: typeof raw?.searchSuggestionsEnabled === "boolean" ? raw.searchSuggestionsEnabled : emptySettings.searchSuggestionsEnabled,
    applicationNotificationsEnabled: typeof raw?.applicationNotificationsEnabled === "boolean" ? raw.applicationNotificationsEnabled : emptySettings.applicationNotificationsEnabled,
    emailNotificationsEnabled: typeof raw?.emailNotificationsEnabled === "boolean" ? raw.emailNotificationsEnabled : emptySettings.emailNotificationsEnabled,
    historyTrackingEnabled: typeof raw?.historyTrackingEnabled === "boolean" ? raw.historyTrackingEnabled : emptySettings.historyTrackingEnabled,
    reducedMotion: typeof raw?.reducedMotion === "boolean" ? raw.reducedMotion : emptySettings.reducedMotion,
    theme,
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("Preferences");
  const [activity, setActivity] = useState<Activity>("idle");
  const [message, setMessage] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<Record<MediaKind, string>>({
    avatar: "",
    banner: "",
    background: "",
  });
  const previewUrls = useRef<Record<MediaKind, string>>({ avatar: "", banner: "", background: "" });
  const [busyMedia, setBusyMedia] = useState<MediaKind | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const section = new URLSearchParams(window.location.search).get("section");
      if (section === "media") setActiveSection("Media studio");
      else if (section === "appearance") setActiveSection("Appearance");
      else if (section === "preferences") setActiveSection("Preferences");
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const setMediaPreview = useCallback((kind: MediaKind, url: string) => {
    const previous = previewUrls.current[kind];
    if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
    previewUrls.current[kind] = url;
    setMediaPreviews((current) => ({ ...current, [kind]: url }));
  }, []);

  useEffect(() => {
    const previews = previewUrls.current;
    return () => {
      Object.values(previews).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const load = useCallback(() => {
    void Promise.all([
      fetch("/api/profile", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ])
      .then(async ([profileResponse, settingsResponse]) => {
        const [profileData, settingsData] = await Promise.all([
          profileResponse.json().catch(() => ({})),
          settingsResponse.json().catch(() => ({})),
        ]);
        if (!profileResponse.ok || !profileData.profile) {
          throw new Error(typeof profileData.error === "string" ? profileData.error : "Could not load your profile.");
        }
        if (!settingsResponse.ok || !settingsData.settings) {
          throw new Error(typeof settingsData.error === "string" ? settingsData.error : "Could not load your settings.");
        }
        const nextProfile = fromProfile(profileData.profile);
        const nextSettings = fromSettings(settingsData.settings);
        setProfile(nextProfile);
        setSettings(nextSettings);
        setProfileLoaded(true);
        applyAppearanceToDocument({
          ...readCachedAppearance(),
          theme: nextSettings.theme,
          reducedMotion: nextSettings.reducedMotion,
          accentColor: nextProfile.accentColor,
          glassIntensity: nextProfile.glassIntensity,
          glassBlur: nextProfile.glassBlur,
          panelOpacity: nextProfile.panelOpacity,
          borderIntensity: nextProfile.borderIntensity,
          backgroundUrl: sanitizeImageUrl(nextProfile.backgroundUrl),
        });
      })
      .catch((cause: unknown) => {
        setActivity("error");
        setMessage(cause instanceof Error ? cause.message : "Could not load account settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profileLoaded) return;
    applyAppearanceToDocument({
      ...readCachedAppearance(),
      theme: settings.theme as AppearanceTheme,
      reducedMotion: settings.reducedMotion,
      accentColor: profile.accentColor,
      glassIntensity: profile.glassIntensity,
      glassBlur: profile.glassBlur,
      panelOpacity: profile.panelOpacity,
      borderIntensity: profile.borderIntensity,
      backgroundUrl: sanitizeImageUrl(profile.backgroundUrl),
    });
  }, [
    profileLoaded,
    profile.accentColor,
    profile.glassIntensity,
    profile.glassBlur,
    profile.panelOpacity,
    profile.borderIntensity,
    profile.backgroundUrl,
    settings.theme,
    settings.reducedMotion,
  ]);

  function updateProfile<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setActivity("idle");
    setMessage("");
  }

  async function saveProfilePatch(patch: Partial<Profile>, successMessage: string) {
    setActivity("working");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: Record<string, unknown>;
        error?: unknown;
      };
      if (!response.ok || !data.profile) {
        throw new Error(typeof data.error === "string" ? data.error : "Your changes were not saved.");
      }
      const next = fromProfile(data.profile);
      setProfile(next);
      setProfileLoaded(true);
      setActivity("done");
      setMessage(successMessage);
      try {
        localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
      } catch {
        // The API response is authoritative; localStorage is only a cache.
      }
      return true;
    } catch (cause) {
      setActivity("error");
      setMessage(cause instanceof Error ? cause.message : "Could not reach the profile service.");
      return false;
    }
  }

  async function saveSettings(next: Settings) {
    setSettings(next);
    setActivity("working");
    setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await response.json().catch(() => ({}))) as {
        settings?: Record<string, unknown>;
        error?: unknown;
      };
      if (!response.ok || !data.settings) {
        throw new Error(typeof data.error === "string" ? data.error : "Your settings were not saved.");
      }
      const normalized = fromSettings(data.settings);
      setSettings(normalized);
      setActivity("done");
      setMessage("Preferences saved to your account.");
      try {
        localStorage.setItem("jobrain-settings", JSON.stringify(data.settings));
      } catch {
        // Ignore an unavailable local cache.
      }
      return true;
    } catch (cause) {
      setActivity("error");
      setMessage(cause instanceof Error ? cause.message : "Could not reach the settings service.");
      return false;
    }
  }

  async function saveMediaUrl(kind: MediaKind) {
    const field = mediaFields[kind];
    await saveProfilePatch({ [field]: profile[field] }, `${mediaLabels[kind]} saved to your account.`);
  }

  async function uploadMedia(kind: MediaKind, file: File | null) {
    if (!file) return;
    if (file.size > MEDIA_LIMITS[kind].maxBytes) {
      setActivity("error");
      setMessage(`${mediaLabels[kind]} is too large. Choose a smaller image.`);
      return;
    }
    setBusyMedia(kind);
    setActivity("working");
    setMessage("");
    setMediaPreview(kind, URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        profile?: Record<string, unknown>;
        error?: string;
        code?: string;
      };
      if (!response.ok || !data.profile || !data.url) {
        throw new Error(
          data.code === "STORAGE_UNAVAILABLE"
            ? "Image upload storage is not connected. Paste a public HTTPS image URL below and choose Save image, or connect Vercel Blob to enable file uploads."
            : data.error ?? "Upload failed. The image was not saved.",
        );
      }
      setProfile(fromProfile(data.profile));
      setProfileLoaded(true);
      setMediaPreview(kind, "");
      setActivity("done");
      setMessage(`${mediaLabels[kind]} uploaded and saved.`);
    } catch (cause) {
      setMediaPreview(kind, "");
      setActivity("error");
      setMessage(cause instanceof Error ? cause.message : "Upload failed. The image was not saved.");
    } finally {
      setBusyMedia(null);
    }
  }

  async function removeMedia(kind: MediaKind) {
    setBusyMedia(kind);
    setActivity("working");
    setMessage("");
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: Record<string, unknown>;
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? `Could not remove ${mediaLabels[kind].toLowerCase()}.`);
      }
      setProfile(fromProfile(data.profile));
      setMediaPreview(kind, "");
      setActivity("done");
      setMessage(`${mediaLabels[kind]} removed.`);
    } catch (cause) {
      setActivity("error");
      setMessage(cause instanceof Error ? cause.message : "Could not remove media.");
    } finally {
      setBusyMedia(null);
    }
  }

  function applyPreset(name: (typeof presetOrder)[number]) {
    const preset = APPEARANCE_PRESETS[name];
    if (!preset) return;
    setProfile((current) => ({ ...current, ...preset }));
    void saveProfilePatch(preset, `${name.charAt(0).toUpperCase() + name.slice(1)} appearance saved.`);
  }

  const activityLabel = activity === "working" ? "Saving changes" : activity === "done" ? "Saved" : "Save failed";

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="settings" />
        <header className="account-head">
          <div>
            <div className="account-kicker">ACCOUNT / 02</div>
            <h1 className="account-title">Settings</h1>
          </div>
          <Link href="/profile" className="account-button">Back to profile ↗</Link>
        </header>

        {activity !== "idle" ? (
          <div className="account-operation" aria-live="polite">
            <LatticeLoader
              status={activity}
              label="Saving changes"
              doneLabel="Saved"
              errorLabel="Failed"
              pattern="orbit"
              grid={3}
              shape="round"
              cellSize={5}
              gap={2}
              fontSize={12}
              showTimer
            />
            {message ? <span className="account-operation-message">{message}</span> : <span className="account-operation-message">{activityLabel}</span>}
          </div>
        ) : null}

        {loading ? <div className="account-operation"><LatticeLoader label="Loading settings" status="working" cellSize={5} gap={2} fontSize={11} showTimer={false} /></div> : null}

        <div className="settings-layout">
          <aside className="settings-subnav account-card" aria-label="Settings sections">
            <div className="account-kicker">SETTINGS MENU</div>
            <OptionWheel
              items={settingsSections.map((section) => section.label)}
              icons={settingsSections.map(({ icon: Icon, label }) => <Icon key={label} size={17} strokeWidth={1.7} />)}
              defaultSelected={0}
              textColor="#8997a0"
              activeColor="#f4f7f9"
              fontSize={1}
              spacing={1.75}
              curve={0.65}
              tilt={5}
              blur={0.5}
              fade={0.16}
              minOpacity={0.25}
              smoothing={180}
              inset={10}
              onChange={(index) => {
                const section = settingsSections[index];
                if (section) setActiveSection(section.label);
              }}
              className="settings-section-wheel"
            />
            <p className="settings-subnav-help">Scroll, drag, or use arrow keys to switch sections.</p>
          </aside>

          <div className="settings-panel">
            {activeSection === "Preferences" ? (
              <section className="account-card settings-main-card">
                <div className="settings-card-heading">
                  <div>
                    <h2>Workflow preferences</h2>
                    <p>Each switch saves to your account immediately.</p>
                  </div>
                </div>
                {preferenceItems.map(({ key, title, description, icon: Icon }) => (
                  <div className="account-toggle settings-toggle" key={key}>
                    <span className="settings-toggle-icon" aria-hidden="true"><Icon size={17} /></span>
                    <div className="settings-toggle-copy">
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </div>
                    <button
                      type="button"
                      className={"account-switch " + (settings[key] ? "is-on" : "")}
                      aria-pressed={settings[key]}
                      aria-label={title}
                      disabled={loading}
                      onClick={() => void saveSettings({ ...settings, [key]: !settings[key] })}
                    />
                  </div>
                ))}
                <div className="settings-divider" />
                <label className="account-field">
                  <span>Color scheme</span>
                  <select
                    value={settings.theme}
                    onChange={(event) => void saveSettings({ ...settings, theme: event.target.value as Settings["theme"] })}
                    aria-label="Color scheme"
                  >
                    <option value="dark">Dark graphite</option>
                    <option value="light">Light mist</option>
                    <option value="system">Use system setting</option>
                  </select>
                </label>
                <div className="account-toggle settings-toggle">
                  <span className="settings-toggle-icon" aria-hidden="true"><Sparkles size={17} /></span>
                  <div className="settings-toggle-copy">
                    <strong>Reduced motion</strong>
                    <small>Reduce ambient movement and transitions.</small>
                  </div>
                  <button
                    type="button"
                    className={"account-switch " + (settings.reducedMotion ? "is-on" : "")}
                    aria-pressed={settings.reducedMotion}
                    aria-label="Reduced motion"
                    disabled={loading}
                    onClick={() => void saveSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
                  />
                </div>
              </section>
            ) : null}

            {activeSection === "Media studio" ? (
              <section className="account-card settings-main-card">
                <div className="settings-card-heading">
                  <div>
                    <h2>Media studio</h2>
                    <p>Avatar, banner and page wallpaper are saved to your profile. Use a hosted URL or upload a file when storage is connected.</p>
                  </div>
                </div>
                <div className="settings-media-preview-grid">
                  {(["avatar", "banner", "background"] as const).map((kind) => {
                    const field = mediaFields[kind];
                    const source = mediaPreviews[kind] || sanitizeImageUrl(profile[field]) || "";
                    return (
                      <div className={"settings-media-preview settings-media-preview-" + kind} key={kind}>
                        <div className="settings-media-art">
                          {source ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={source} alt="" decoding="async" />
                          ) : (
                            <span className="settings-media-placeholder">
                              {kind === "avatar" ? "A" : kind === "banner" ? "BANNER" : "BACKGROUND"}
                            </span>
                          )}
                        </div>
                        <div className="settings-media-caption">
                          <strong>{mediaLabels[kind]}</strong>
                          <small>{kind === "avatar" ? "Square portrait" : kind === "banner" ? "Profile cover" : "App wallpaper"}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(["avatar", "banner", "background"] as const).map((kind) => {
                  const field = mediaFields[kind];
                  const maxMb = Math.round(MEDIA_LIMITS[kind].maxBytes / (1024 * 1024));
                  return (
                    <div className="settings-media-editor" key={kind}>
                      <div className="settings-media-editor-heading">
                        <div>
                          <strong>{mediaLabels[kind]}</strong>
                          <small>Max {maxMb} MB</small>
                        </div>
                        <div className="settings-media-actions">
                          <label className="account-button settings-upload-button">
                            <UploadCloud size={14} />
                            {busyMedia === kind ? <LatticeLoader label="Uploading" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Choose file"}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              aria-label={`Upload ${mediaLabels[kind]}`}
                              disabled={busyMedia !== null}
                              onChange={(event) => {
                                const input = event.currentTarget;
                                const file = input.files?.[0] ?? null;
                                input.value = "";
                                if (file) void uploadMedia(kind, file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="account-button settings-icon-button"
                            aria-label={`Remove ${mediaLabels[kind]}`}
                            disabled={busyMedia !== null}
                            onClick={() => void removeMedia(kind)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <label className="account-field">
                        <span>Public image URL</span>
                        <input
                          type="url"
                          value={profile[field]}
                          onChange={(event) => updateProfile(field, event.target.value)}
                          placeholder="https://images.example.com/…"
                          autoComplete="url"
                          spellCheck={false}
                        />
                      </label>
                      <div className="account-actions settings-media-save">
                        {kind === "background" ? (
                          <button
                            type="button"
                            className="account-button"
                            disabled={busyMedia !== null}
                            onClick={() => void saveProfilePatch({ backgroundUrl: "" }, "Default background restored.")}
                          >
                            <RotateCcw size={14} /> Reset background
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="account-button account-button-primary"
                          disabled={busyMedia !== null}
                          onClick={() => void saveMediaUrl(kind)}
                        >
                          Save {kind === "background" ? "background" : kind}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : null}

            {activeSection === "Appearance" ? (
              <section className="account-card settings-main-card">
                <div className="settings-card-heading">
                  <div>
                    <h2>Appearance</h2>
                    <p>Preview changes live across JoBrain, then save them to your profile.</p>
                  </div>
                  <span className="settings-live-indicator"><span /> LIVE PREVIEW</span>
                </div>
                <div className="settings-appearance-preview">
                  <div className="settings-preview-orb" aria-hidden="true" />
                  <div className="settings-preview-panel">
                    <span className="settings-preview-label">GLASS SURFACE</span>
                    <div className="settings-preview-lines"><i /><i /><i /></div>
                    <span className="settings-preview-chip">Live tokens</span>
                  </div>
                </div>
                <label className="account-field settings-color-field">
                  <span>Accent color</span>
                  <div className="settings-color-control">
                    <input
                      type="color"
                      value={profile.accentColor}
                      aria-label="Accent color"
                      onChange={(event) => updateProfile("accentColor", event.target.value)}
                    />
                    <input
                      type="text"
                      value={profile.accentColor}
                      maxLength={7}
                      aria-label="Accent hex code"
                      onChange={(event) => {
                        const value = event.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(value)) updateProfile("accentColor", value);
                      }}
                    />
                  </div>
                </label>
                <label className="account-field settings-range-field">
                  <span>Glass intensity <strong>{profile.glassIntensity}%</strong></span>
                  <input type="range" min={0} max={80} value={profile.glassIntensity} onChange={(event) => updateProfile("glassIntensity", Number(event.target.value))} aria-label="Glass intensity" />
                </label>
                <label className="account-field settings-range-field">
                  <span>Glass blur <strong>{profile.glassBlur}px</strong></span>
                  <input type="range" min={0} max={24} value={profile.glassBlur} onChange={(event) => updateProfile("glassBlur", Number(event.target.value))} aria-label="Glass blur" />
                </label>
                <label className="account-field settings-range-field">
                  <span>Panel opacity <strong>{profile.panelOpacity}%</strong></span>
                  <input type="range" min={40} max={95} value={profile.panelOpacity} onChange={(event) => updateProfile("panelOpacity", Number(event.target.value))} aria-label="Panel opacity" />
                </label>
                <label className="account-field settings-range-field">
                  <span>Border intensity <strong>{profile.borderIntensity}%</strong></span>
                  <input type="range" min={0} max={100} value={profile.borderIntensity} onChange={(event) => updateProfile("borderIntensity", Number(event.target.value))} aria-label="Border intensity" />
                </label>
                <div className="settings-presets">
                  <div>
                    <strong>Quick presets</strong>
                    <small>Start from a tuned glass profile and adjust it further.</small>
                  </div>
                  <div className="settings-preset-list">
                    {presetOrder.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="account-button"
                        onClick={() => applyPreset(name)}
                      >
                        <span className={"settings-preset-swatch settings-preset-" + name} />
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="account-actions">
                  <button
                    type="button"
                    className="account-button account-button-primary"
                    disabled={loading || activity === "working"}
                    onClick={() => void saveProfilePatch({
                      accentColor: profile.accentColor,
                      glassIntensity: profile.glassIntensity,
                      glassBlur: profile.glassBlur,
                      panelOpacity: profile.panelOpacity,
                      borderIntensity: profile.borderIntensity,
                    }, "Appearance saved to your account.")}
                  >
                    Save appearance
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
