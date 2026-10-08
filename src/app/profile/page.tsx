"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AccountNav from "@/components/AccountNav";

type Profile = {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  accentColor: string | null;
  glassIntensity: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    displayName: "",
    bio: "",
    avatarUrl: "",
    bannerUrl: "",
    backgroundUrl: "",
    accentColor: "#b8c9d6",
    glassIntensity: 45,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile");
        const data = await response.json();
        setProfile(data.profile);
      })
      .catch(() => setError("Sign in to edit your profile."));
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaved(false);
    setError("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      setError("Could not save profile.");
      return;
    }
    const data = await response.json();
    setProfile(data.profile);
    localStorage.setItem("jobrain-profile", JSON.stringify(data.profile));
    document.documentElement.style.setProperty("--jb-user-accent", data.profile.accentColor ?? "#b8c9d6");
    document.documentElement.style.setProperty("--jb-glass-alpha", String(0.16 + (data.profile.glassIntensity ?? 45) / 500));
    if (data.profile.backgroundUrl) {
      document.documentElement.style.setProperty("--jb-user-background", `url("${data.profile.backgroundUrl}")`);
      document.documentElement.dataset.customBackground = "true";
    } else {
      document.documentElement.style.removeProperty("--jb-user-background");
      delete document.documentElement.dataset.customBackground;
    }
    setSaved(true);
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="profile" />
        <header className="account-head">
          <div>
            <div className="account-kicker">ACCOUNT / 01</div>
            <h1 className="account-title">Your professional profile.</h1>
            <p className="account-copy">
              Build the public-facing identity behind your job search. Avatar, banner, bio, background and glass intensity live with your account.
            </p>
          </div>
          <Link className="account-button" href="/projects">Build portfolio →</Link>
        </header>

        {error ? <p className="account-muted">{error}</p> : null}

        <section className="profile-banner">
          {profile.bannerUrl ? <img src={profile.bannerUrl} alt="" /> : null}
          <div className="profile-identity">
            <div className="profile-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : null}
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

        <div className="account-grid" style={{ marginTop: 16 }}>
          <section className="account-card">
            <h2>Identity</h2>
            <label className="account-field"><span>Display name</span><input value={profile.displayName ?? ""} onChange={(e) => update("displayName", e.target.value)} /></label>
            <label className="account-field"><span>Bio</span><textarea value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} /></label>
            <label className="account-field"><span>Avatar URL</span><input value={profile.avatarUrl ?? ""} onChange={(e) => update("avatarUrl", e.target.value)} placeholder="https://..." /></label>
            <label className="account-field"><span>Banner URL</span><input value={profile.bannerUrl ?? ""} onChange={(e) => update("bannerUrl", e.target.value)} placeholder="https://..." /></label>
          </section>

          <section className="account-card">
            <h2>Interface identity</h2>
            <p>Use a direct image URL for now. The next storage layer can replace this with persistent PNG/JPG/GIF uploads without changing your profile model.</p>
            <label className="account-field"><span>Background image URL</span><input value={profile.backgroundUrl ?? ""} onChange={(e) => update("backgroundUrl", e.target.value)} placeholder="PNG / JPG / GIF URL" /></label>
            <label className="account-field"><span>Accent</span><input type="color" value={profile.accentColor ?? "#b8c9d6"} onChange={(e) => update("accentColor", e.target.value)} /></label>
            <label className="account-field"><span>Glass intensity · {profile.glassIntensity}%</span><input type="range" min="0" max="80" value={profile.glassIntensity} onChange={(e) => update("glassIntensity", Number(e.target.value))} /></label>
            <div className="account-actions">
              <button className="account-button account-button-primary" type="button" onClick={() => void save()}>
                {saved ? "Saved" : "Save profile"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
