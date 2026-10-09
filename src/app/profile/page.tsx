"use client";

import Link from "next/link";
import ProfilePortfolio from "@/components/ProfilePortfolio";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountNav from "@/components/AccountNav";
import { applyAppearanceToDocument, readCachedAppearance } from "@/lib/appearance";
import { MEDIA_LIMITS, sanitizeImageUrl, type MediaKind } from "@/lib/media";

type Profile = {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  accentColor: string | null;
  glassIntensity: number;
  glassBlur: number;
  panelOpacity: number;
  borderIntensity: number;
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

function isGifUrl(value: string | null | undefined): boolean {
  return Boolean(value && /\.gif(?:$|[?#])/i.test(value));
}

function fromApi(raw: Record<string, unknown> | null | undefined): Profile {
  return {
    displayName: (raw?.displayName as string) ?? "",
    bio: (raw?.bio as string) ?? "",
    avatarUrl: (raw?.avatarUrl as string) ?? "",
    bannerUrl: (raw?.bannerUrl as string) ?? "",
    backgroundUrl: (raw?.backgroundUrl as string) ?? "",
    accentColor: (raw?.accentColor as string) ?? "#b8c9d6",
    glassIntensity: typeof raw?.glassIntensity === "number" ? raw.glassIntensity : 45,
    glassBlur: typeof raw?.glassBlur === "number" ? raw.glassBlur : 12,
    panelOpacity: typeof raw?.panelOpacity === "number" ? raw.panelOpacity : 72,
    borderIntensity: typeof raw?.borderIntensity === "number" ? raw.borderIntensity : 40,
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [baseline, setBaseline] = useState<Profile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<Record<MediaKind, string>>({
    avatar: "",
    banner: "",
    background: "",
  });
  const [localMediaPreview, setLocalMediaPreview] = useState<Record<MediaKind, string>>({
    avatar: "",
    banner: "",
    background: "",
  });
  const previewUrls = useRef<Record<MediaKind, string>>({ avatar: "", banner: "", background: "" });

  useEffect(() => {
    return () => {
      Object.values(previewUrls.current).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);
  const dirty = JSON.stringify(profile) !== JSON.stringify(baseline);

  const load = useCallback(() => {
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          profile?: Record<string, unknown>;
          error?: unknown;
        };
        if (!response.ok || !data.profile) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not load profile (HTTP " + response.status + ").",
          );
        }
        const next = fromApi(data.profile);
        setProfile(next);
        setBaseline(next);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load your profile. Please retry.");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the shared appearance live while editing, without resetting theme or motion preferences.
  useEffect(() => {
    if (!loaded) return;
    const cached = readCachedAppearance();
    applyAppearanceToDocument({
      ...cached,
      accentColor: profile.accentColor ?? cached.accentColor,
      glassIntensity: profile.glassIntensity,
      glassBlur: profile.glassBlur,
      panelOpacity: profile.panelOpacity,
      borderIntensity: profile.borderIntensity,
      backgroundUrl: sanitizeImageUrl(profile.backgroundUrl),
    });
  }, [
    loaded,
    profile.accentColor,
    profile.glassIntensity,
    profile.glassBlur,
    profile.panelOpacity,
    profile.borderIntensity,
    profile.backgroundUrl,
  ]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: Record<string, unknown>;
        error?: unknown;
      };
      if (!response.ok || !data.profile) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Profile was not saved (HTTP " + response.status + ").",
        );
        return;
      }

      const next = fromApi(data.profile);
      setProfile(next);
      setBaseline(next);
      try {
        // This cache is optional; the successful database response is authoritative.
        localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
      } catch {
        // A disabled or full localStorage must not prevent a successful save.
      }
      try {
        applyAppearanceToDocument({
          ...readCachedAppearance(),
          accentColor: next.accentColor ?? undefined,
          glassIntensity: next.glassIntensity,
          glassBlur: next.glassBlur,
          panelOpacity: next.panelOpacity,
          borderIntensity: next.borderIntensity,
          backgroundUrl: next.backgroundUrl || null,
        });
      } catch {
        // Persisted profile settings remain saved even if the local preview cannot update.
      }
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? "Save failed: " + cause.message
          : "Could not reach the profile service. Your changes are still unsaved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function setLocalPreview(kind: MediaKind, file: File | null) {
    const previous = previewUrls.current[kind];
    if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
    const next = file ? URL.createObjectURL(file) : "";
    previewUrls.current[kind] = next;
    setLocalMediaPreview((current) => ({ ...current, [kind]: next }));
  }

  async function uploadMedia(kind: MediaKind, file: File | null) {
    if (!file) return;
    setUploadState((current) => ({ ...current, [kind]: "Uploading…" }));
    setError("");
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string; code?: string };
      if (!response.ok) {
        if (data.code === "STORAGE_UNAVAILABLE") {
          setUploadState((current) => ({
            ...current,
            [kind]: "Preview only: connect Vercel Blob storage to save uploaded files, or paste a public image URL.",
          }));
        } else {
          setUploadState((current) => ({ ...current, [kind]: data.error ?? "Upload failed." }));
        }
        return;
      }
      const field = kind === "avatar" ? "avatarUrl" : kind === "banner" ? "bannerUrl" : "backgroundUrl";
      update(field, data.url ?? "");
      setLocalPreview(kind, null);
      setUploadState((current) => ({ ...current, [kind]: "Upload complete." }));
    } catch {
      setUploadState((current) => ({ ...current, [kind]: "Upload failed." }));
    }
  }

  async function removeMedia(kind: MediaKind) {
    setLocalPreview(kind, null);
    setUploadState((current) => ({ ...current, [kind]: "Removing…" }));
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        setUploadState((current) => ({ ...current, [kind]: "Could not remove media. Please try again." }));
        return;
      }
      const field = kind === "avatar" ? "avatarUrl" : kind === "banner" ? "bannerUrl" : "backgroundUrl";
      update(field, "");
      setUploadState((current) => ({ ...current, [kind]: "Removed." }));
    } catch {
      setUploadState((current) => ({ ...current, [kind]: "Could not remove media. Please try again." }));
    }
  }

  const previewAvatarUrl = localMediaPreview.avatar || profile.avatarUrl;
  const previewBannerUrl = localMediaPreview.banner || profile.bannerUrl;
  const previewBackgroundUrl = localMediaPreview.background || profile.backgroundUrl;

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="profile" />
        <header className="account-head">
          <div>
            <div className="account-kicker">ACCOUNT / 01</div>
            <h1 className="account-title">Your professional profile.</h1>
            <p className="account-copy">
              Identity, media and appearance live together. Preview updates live; save when you are ready.
            </p>
          </div>
          <div className="account-actions">
            <Link className="account-button" href="/projects">
              Build portfolio →
            </Link>
            <button
              className="account-button account-button-primary"
              type="button"
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : saved ? "Saved" : dirty ? "Save profile" : "Up to date"}
            </button>
          </div>
        </header>

        {error ? (
          <p className="account-muted" role="alert">
            {error}
          </p>
        ) : null}

        <section className="profile-banner" aria-label="Profile preview">
          {previewBannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewBannerUrl} alt="" decoding="async" />
          ) : null}
          <div className="profile-identity">
            <div className="profile-avatar">
              {previewAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewAvatarUrl} alt="" decoding="async" />
              ) : (
                <span className="profile-avatar-placeholder">
                  {(profile.displayName || "JB").trim().slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="account-kicker">PROFILE</div>
              <h2 className="account-title" style={{ fontSize: "clamp(1.7rem, 4vw, 3rem)" }}>
                {profile.displayName || "Your name"}
              </h2>
              <p className="account-copy">{profile.bio || "A focused profile for the work you want next."}</p>
            </div>
          </div>
        </section>

        <ProfilePortfolio />

        <div className="account-grid" style={{ marginTop: 16 }}>
          <section className="account-card">
            <h2>Identity</h2>
            <label className="account-field">
              <span>Display name</span>
              <input
                value={profile.displayName ?? ""}
                onChange={(e) => update("displayName", e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="account-field">
              <span>Bio</span>
              <textarea
                value={profile.bio ?? ""}
                onChange={(e) => update("bio", e.target.value)}
                maxLength={1200}
                rows={4}
              />
            </label>
          </section>

          <section className="account-card">
            <h2>Media studio</h2>
            <p>Upload PNG, JPG, WebP, or animated GIF for your avatar, banner, and page background. Changes preview here before you save.</p>
            <div className="profile-media-previews" aria-label="Live media previews">
              <div className="profile-media-preview">
                <div className="profile-media-preview-art is-avatar">
                  {previewAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewAvatarUrl} alt="" decoding="async" />
                  ) : (
                    <span className="profile-media-empty-mark">A</span>
                  )}
                  {isGifUrl(previewAvatarUrl) ? <span className="profile-media-gif-badge">GIF</span> : null}
                </div>
                <div className="profile-media-preview-label">
                  <strong>Avatar</strong>
                  <small>{isGifUrl(previewAvatarUrl) ? "Animated GIF" : "Square image"}</small>
                </div>
              </div>
              <div className="profile-media-preview">
                <div className="profile-media-preview-art is-banner">
                  {previewBannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewBannerUrl} alt="" decoding="async" />
                  ) : (
                    <span className="profile-media-empty-mark">BANNER</span>
                  )}
                  {isGifUrl(previewBannerUrl) ? <span className="profile-media-gif-badge">GIF</span> : null}
                </div>
                <div className="profile-media-preview-label">
                  <strong>Banner</strong>
                  <small>{isGifUrl(previewBannerUrl) ? "Animated GIF" : "Wide cover"}</small>
                </div>
              </div>
              <div className="profile-media-preview">
                <div className="profile-media-preview-art is-background">
                  {previewBackgroundUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewBackgroundUrl} alt="" decoding="async" />
                  ) : (
                    <span className="profile-media-empty-mark">PATTERN</span>
                  )}
                  {isGifUrl(previewBackgroundUrl) ? <span className="profile-media-gif-badge">GIF</span> : null}
                </div>
                <div className="profile-media-preview-label">
                  <strong>Background</strong>
                  <small>{isGifUrl(previewBackgroundUrl) ? "Animated wallpaper" : profile.backgroundUrl ? "Custom wallpaper" : "Theme default"}</small>
                </div>
              </div>
            </div>
            {(
              [
                ["avatar", "Avatar", MEDIA_LIMITS.avatar.maxBytes],
                ["banner", "Banner", MEDIA_LIMITS.banner.maxBytes],
                ["background", "Background", MEDIA_LIMITS.background.maxBytes],
              ] as Array<[MediaKind, string, number]>
            ).map(([kind, label, maxBytes]) => (
              <div key={kind} className="account-field">
                <span>
                  {label} · max {Math.round(maxBytes / (1024 * 1024))}MB
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  aria-label={`Upload ${label}`}
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0] ?? null;
                    if (!file) return;
                    setLocalPreview(kind, file);
                    void uploadMedia(kind, file);
                    input.value = "";
                  }}
                />
                <div className="account-actions" style={{ marginTop: 8 }}>
                  <button className="account-button" type="button" onClick={() => void removeMedia(kind)}>
                    Remove {label.toLowerCase()}
                  </button>
                </div>
                {uploadState[kind] ? <small className="account-muted">{uploadState[kind]}</small> : null}
                <label className="account-field" style={{ marginTop: 8 }}>
                  <span>Or public URL</span>
                  <input
                    value={
                      kind === "avatar"
                        ? (profile.avatarUrl ?? "")
                        : kind === "banner"
                          ? (profile.bannerUrl ?? "")
                          : (profile.backgroundUrl ?? "")
                    }
                    onChange={(e) => {
                      setLocalPreview(kind, null);
                      update(
                        kind === "avatar" ? "avatarUrl" : kind === "banner" ? "bannerUrl" : "backgroundUrl",
                        e.target.value,
                      );
                    }}
                    placeholder="https://…"
                  />
                </label>
              </div>
            ))}
            <div className="account-actions">
              <button
                className="account-button"
                type="button"
                onClick={() => {
                  setLocalPreview("background", null);
                  update("backgroundUrl", "");
                  setUploadState((c) => ({ ...c, background: "Default background restored locally." }));
                }}
              >
                Restore default background
              </button>
            </div>
          </section>

          <section className="account-card">
            <h2>Appearance tokens</h2>
            <p>These tokens apply across the product through shared CSS variables. Save to persist.</p>
            <label className="account-field">
              <span>Accent</span>
              <input
                type="color"
                value={profile.accentColor ?? "#b8c9d6"}
                onChange={(e) => update("accentColor", e.target.value)}
                aria-label="Accent color"
              />
            </label>
            <label className="account-field">
              <span>Glass intensity · {profile.glassIntensity}%</span>
              <input
                type="range"
                min={0}
                max={80}
                value={profile.glassIntensity}
                onChange={(e) => update("glassIntensity", Number(e.target.value))}
                aria-label="Glass intensity"
              />
            </label>
            <label className="account-field">
              <span>Glass blur · {profile.glassBlur}px</span>
              <input
                type="range"
                min={0}
                max={24}
                value={profile.glassBlur}
                onChange={(e) => update("glassBlur", Number(e.target.value))}
                aria-label="Glass blur"
              />
            </label>
            <label className="account-field">
              <span>Panel opacity · {profile.panelOpacity}%</span>
              <input
                type="range"
                min={40}
                max={95}
                value={profile.panelOpacity}
                onChange={(e) => update("panelOpacity", Number(e.target.value))}
                aria-label="Panel opacity"
              />
            </label>
            <label className="account-field">
              <span>Border intensity · {profile.borderIntensity}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={profile.borderIntensity}
                onChange={(e) => update("borderIntensity", Number(e.target.value))}
                aria-label="Border intensity"
              />
            </label>
          </section>
        </div>
      </div>
    </main>
  );
}
