"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountNav from "@/components/AccountNav";

type Project = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  liveUrl: string | null;
  languages: Record<string, number> | null;
  technologies: string[] | null;
};

type Draft = {
  repositoryUrl: string;
  name: string;
  description: string | null;
  liveUrl: string | null;
  languages: Record<string, number>;
  technologies: string[];
  readme: string;
  framework: string | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function scan() {
    setLoading(true);
    setMessage("");
    setDraft(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", repositoryUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not scan repository.");
        return;
      }
      setDraft(data.draft as Draft);
      setMessage("Review the scanned project, edit anything needed, then submit.");
    } catch {
      setMessage("Could not reach GitHub.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!draft) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", project: draft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not save project.");
        return;
      }
      setProjects((current) => [data.project, ...current.filter((project) => project.id !== data.project.id)]);
      setDraft(null);
      setRepositoryUrl("");
      setMessage("Project saved to your portfolio.");
    } catch {
      setMessage("Could not save project.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setMessage("");
    try {
      const response = await fetch("/api/projects?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        setMessage(
          typeof data.error === "string"
            ? data.error
            : "Project was not removed (HTTP " + response.status + ").",
        );
        return;
      }
      setProjects((current) => current.filter((project) => project.id !== id));
      setMessage("Project removed from your portfolio.");
    } catch {
      setMessage("Could not reach the project service. The project has not been removed.");
    }
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="projects" />
        <header className="account-head">
          <div>
            <div className="account-kicker">PROJECTS / 03</div>
            <h1 className="account-title">Turn repositories into portfolio entries.</h1>
            <p className="account-copy">
              Paste a public GitHub repository. JoBrain scans metadata, languages, dependencies, README and live-demo
              hints — then you review and submit before anything is saved.
            </p>
          </div>
          <Link className="account-button" href="/profile">
            Profile →
          </Link>
        </header>

        <section className="account-card account-card-wide">
          <h2>Repository scanner</h2>
          <label className="account-field">
            <span>GitHub repository</span>
            <input
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="account-actions">
            <button
              className="account-button account-button-primary"
              type="button"
              disabled={loading || !repositoryUrl.trim()}
              onClick={() => void scan()}
            >
              {loading ? "Scanning…" : "Scan repository"}
            </button>
          </div>
          {message ? <p className="account-muted">{message}</p> : null}
        </section>

        {draft ? (
          <section className="account-card account-card-wide" style={{ marginTop: 16 }}>
            <h2>Review scanned project</h2>
            {draft.framework ? <p className="account-muted">Detected framework: {draft.framework}</p> : null}
            <label className="account-field">
              <span>Name</span>
              <input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
            </label>
            <label className="account-field">
              <span>Description</span>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => updateDraft("description", e.target.value || null)}
                rows={4}
              />
            </label>
            <label className="account-field">
              <span>Live demo URL</span>
              <input
                value={draft.liveUrl ?? ""}
                onChange={(e) => updateDraft("liveUrl", e.target.value || null)}
                placeholder="https://…"
              />
            </label>
            <label className="account-field">
              <span>Technologies (comma-separated)</span>
              <input
                value={draft.technologies.join(", ")}
                onChange={(e) =>
                  updateDraft(
                    "technologies",
                    e.target.value
                      .split(",")
                      .map((part) => part.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
            <div className="account-actions">
              <button
                className="account-button account-button-primary"
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Saving…" : "Submit to portfolio"}
              </button>
              <button className="account-button" type="button" onClick={() => setDraft(null)}>
                Discard
              </button>
            </div>
          </section>
        ) : null}

        <div className="project-grid">
          {projects.map((project) => {
            const languages = Object.entries(project.languages ?? {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6);
            return (
              <article className="project-card" key={project.id}>
                <h3>{project.name}</h3>
                <p>{project.description || "No description."}</p>
                <div className="project-links">
                  <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
                    Repository ↗
                  </a>
                  {project.liveUrl ? (
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      Live demo ↗
                    </a>
                  ) : null}
                </div>
                <div className="project-tech">
                  {languages.map(([language]) => (
                    <span key={language}>{language}</span>
                  ))}
                  {(project.technologies ?? []).slice(0, 8).map((technology) => (
                    <span key={technology}>{technology}</span>
                  ))}
                </div>
                <div className="account-actions">
                  <button className="account-button" type="button" onClick={() => void remove(project.id)}>
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
