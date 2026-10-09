"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountNav from "@/components/AccountNav";
import LatticeLoader from "@/components/LatticeLoader";
import { BadgeCheck, Github, RefreshCw, Search } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  liveUrl: string | null;
  languages: Record<string, number> | null;
  technologies: string[] | null;
};

type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  fork: boolean;
  verifiedOwner: boolean;
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
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubRepositories, setGithubRepositories] = useState<GitHubRepository[]>([]);
  const [repositorySearch, setRepositorySearch] = useState("");
  const [loadingRepositories, setLoadingRepositories] = useState(true);
  const [repositoryRefresh, setRepositoryRefresh] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/github/repositories", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          connected?: boolean;
          login?: string | null;
          repositories?: GitHubRepository[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not check the GitHub connection.");
        if (cancelled) return;
        setGithubLogin(data.connected && typeof data.login === "string" ? data.login : null);
        setGithubRepositories(Array.isArray(data.repositories) ? data.repositories : []);
        const githubStatus = new URLSearchParams(window.location.search).get("github");
        if (githubStatus === "connected" && data.login) setMessage("GitHub connected as @" + data.login + ". Choose a verified repository below.");
        else if (githubStatus === "not-configured") setMessage("GitHub OAuth is not configured yet. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and GITHUB_REDIRECT_URI in Vercel.");
        else if (githubStatus === "denied") setMessage("GitHub connection was cancelled.");
        else if (githubStatus && githubStatus !== "connected") setMessage("Could not complete GitHub connection (" + githubStatus + "). Please try again.");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setMessage(cause instanceof Error ? cause.message : "Could not load your GitHub repositories.");
      })
      .finally(() => { if (!cancelled) setLoadingRepositories(false); });
    return () => { cancelled = true; };
  }, [repositoryRefresh]);


  async function scan(repository = repositoryUrl) {
    setLoading(true);
    setMessage("");
    setDraft(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", repositoryUrl: repository }),
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
              Connect the GitHub account that owns your projects, select a verified repository, review its metadata,
              and add it to your portfolio.
            </p>
          </div>
          <Link className="account-button" href="/profile">
            Profile →
          </Link>
        </header>

        <section className="account-card account-card-wide project-github-card">
          <div className="settings-card-heading">
            <div>
              <h2><Github size={18} /> GitHub account</h2>
              <p>Connect GitHub to verify ownership before a repository can be added. JoBrain stores the linked username, not your OAuth access token.</p>
            </div>
            <div className="project-github-status">
              {githubLogin ? <><BadgeCheck size={15} /> Verified @{githubLogin}</> : <span>Not connected</span>}
            </div>
          </div>
          {githubLogin ? (
            <div className="project-github-connected">
              <span className="project-github-check"><BadgeCheck size={16} /></span>
              <div>
                <strong>Ownership verification active</strong>
                <small>Only public repositories owned by @{githubLogin} can be scanned or submitted.</small>
              </div>
              <button className="account-button" type="button" onClick={() => { setLoadingRepositories(true); setRepositoryRefresh((value) => value + 1); }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          ) : (
            <div className="project-github-connect">
              <p>Sign in with the GitHub account that owns the work you want to showcase. Your password stays with GitHub.</p>
              <a className="account-button account-button-primary" href="/api/github/connect"><Github size={14} /> Connect GitHub</a>
            </div>
          )}
          {loadingRepositories ? (
            <div className="project-repository-loading">
              <LatticeLoader label="Loading repositories" status="working" cellSize={5} gap={2} fontSize={12} showTimer />
            </div>
          ) : githubLogin ? (
            <>
              <div className="project-repository-toolbar">
                <label className="project-repository-search">
                  <Search size={14} />
                  <input value={repositorySearch} onChange={(event) => setRepositorySearch(event.target.value)} placeholder="Filter your repositories…" aria-label="Filter repositories" />
                </label>
                <span>{githubRepositories.length} public repos</span>
              </div>
              <div className="project-repository-picker">
                {githubRepositories.filter((repository) => (repository.fullName + " " + (repository.description ?? "")).toLowerCase().includes(repositorySearch.toLowerCase())).map((repository) => (
                  <article className="project-repository-option" key={repository.id}>
                    <div className="project-repository-main">
                      <div className="project-repository-title">
                        <strong>{repository.name}</strong>
                        {repository.verifiedOwner ? <span><BadgeCheck size={12} /> VERIFIED</span> : null}
                        {repository.fork ? <small>FORK</small> : null}
                      </div>
                      <small>{repository.fullName}</small>
                      <p>{repository.description || "No repository description."}</p>
                      <div className="project-repository-meta">
                        {repository.language ? <span>{repository.language}</span> : null}
                        <span>Updated {new Date(repository.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="account-button account-button-primary" type="button" disabled={loading} onClick={() => { setRepositoryUrl(repository.url); void scan(repository.url); }}>
                      Add project
                    </button>
                  </article>
                ))}
                {!githubRepositories.length ? <p className="account-muted">No public repositories were returned for this GitHub account.</p> : null}
              </div>
            </>
          ) : null}
          <div className="project-github-manual">
            <h3>Or scan a repository URL</h3>
            <p>The owner still has to match your connected GitHub account.</p>
            <label className="account-field">
              <span>GitHub repository URL</span>
              <input value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/your-account/repository" autoComplete="off" spellCheck={false} />
            </label>
            <div className="account-actions">
              <button className="account-button account-button-primary" type="button" disabled={loading || !githubLogin || !repositoryUrl.trim()} onClick={() => void scan()}>
                {loading ? <LatticeLoader label="Scanning" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Verify & scan URL"}
              </button>
            </div>
          </div>
          {message ? <p className="account-muted project-status-message">{message}</p> : null}
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
                {submitting ? <LatticeLoader label="Saving project" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Submit to portfolio"}
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
