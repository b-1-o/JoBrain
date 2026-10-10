"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import AccountNav from "@/components/AccountNav";
import LatticeLoader from "@/components/LatticeLoader";
import ProfilePortfolio from "@/components/ProfilePortfolio";

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

function fromApi(raw: Record<string, unknown> | null | undefined): Profile {
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [baseline, setBaseline] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    profile.displayName !== baseline.displayName ||
    profile.bio !== baseline.bio;

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
              : "Could not load your profile. Please retry.",
          );
        }
        const next = fromApi(data.profile);
        setProfile(next);
        setBaseline(next);
        try {
          localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
        } catch {
          // The server response remains authoritative when storage is unavailable.
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load your profile. Please retry.");
      })
      .finally(() => setLoading(false));
  }, []);

  useLayoutEffect(() => {
    // The account shell is remounted between routes, so seed it from the profile
    // cache before paint instead of flashing blank placeholders and reloading
    // the avatar/banner visually on every visit.
    try {
      const cached = localStorage.getItem("jobrain-profile");
      if (cached) {
        const next = fromApi(JSON.parse(cached) as Record<string, unknown>);
        setProfile(next);
        setBaseline(next);
        setLoading(false);
      }
    } catch {
      // Refresh from the API if the local cache is unavailable or invalid.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          bio: profile.bio,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: Record<string, unknown>;
        error?: unknown;
      };
      if (!response.ok || !data.profile) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Your changes were not saved. Please retry.",
        );
      }
      const next = fromApi(data.profile);
      setProfile(next);
      setBaseline(next);
      try {
        localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
      } catch {
        // The server response remains authoritative when storage is unavailable.
      }
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the profile service.");
    } finally {
      setSaving(false);
    }
  }

  const status = saving ? "working" : error ? "error" : saved ? "done" : null;

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="profile" />
        <header className="account-head">
          <div>
            <div className="account-kicker">ACCOUNT / 01</div>
            <h1 className="account-title">Profile</h1>
          </div>
          <div className="account-actions account-header-actions">
            {status ? (
              <LatticeLoader
                status={status}
                label="Saving profile"
                doneLabel="Profile saved"
                errorLabel="Save failed"
                pattern="orbit"
                grid={3}
                cellSize={4}
                gap={2}
                fontSize={11}
              />
            ) : null}
            <Link className="account-button" href="/settings">
              Media & appearance <span aria-hidden="true">↗</span>
            </Link>
            <button
              className="account-button account-button-primary"
              type="button"
              disabled={saving || loading || !dirty}
              onClick={() => void saveProfile()}
            >
              {saving ? <LatticeLoader label="Saving" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : saved ? "Saved" : dirty ? "Save profile" : "Up to date"}
            </button>
          </div>
        </header>

        {error ? <p className="account-alert" role="alert">{error}</p> : null}

        <section className="profile-banner" aria-label="Profile preview">
          {profile.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="profile-banner-image" src={profile.bannerUrl} alt="" loading="eager" fetchPriority="high" decoding="async" />
          ) : null}
          <div className="profile-identity">
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" loading="eager" fetchPriority="high" decoding="async" />
              ) : (
                <span className="profile-avatar-placeholder">
                  {(profile.displayName || "JB").trim().slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="account-kicker">PROFILE PREVIEW</div>
              <h2 className="account-title profile-preview-title">
                {profile.displayName || "Your name"}
              </h2>
              <p className="account-copy">
                {profile.bio || "Add a short introduction to your professional profile."}
              </p>
            </div>
          </div>
        </section>

        <div className="account-grid profile-editor-grid">
          <section className="account-card account-card-wide">
            <div className="settings-card-heading">
              <div>
                <h2>Identity</h2>
                <p>Name and bio appear on your profile. Media and visual controls now live in Settings.</p>
              </div>
              {loading ? <LatticeLoader label="Loading profile" status="working" cellSize={4} gap={1} fontSize={10} showTimer={false} /> : null}
            </div>
            <label className="account-field">
              <span>Display name</span>
              <input
                value={profile.displayName}
                onChange={(event) => update("displayName", event.target.value)}
                maxLength={80}
                autoComplete="name"
                placeholder="How people should know you"
              />
            </label>
            <label className="account-field">
              <span>Bio</span>
              <textarea
                value={profile.bio}
                onChange={(event) => update("bio", event.target.value)}
                maxLength={1200}
                rows={4}
                placeholder="What you build, what you focus on, and what you want to work on next."
              />
            </label>
            <div className="account-actions">
              <button
                className="account-button account-button-primary"
                type="button"
                disabled={saving || loading || !dirty}
                onClick={() => void saveProfile()}
              >
                {saving ? <LatticeLoader label="Saving" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : saved ? "Saved" : "Save identity"}
              </button>
            </div>
          </section>
        </div>

        <ProfilePortfolio />
      </div>
    </main>
  );
}
