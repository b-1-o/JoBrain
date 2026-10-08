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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setProjects(Array.isArray(data.projects) ? data.projects : []))
      .catch(() => undefined);
  }, []);

  async function scan() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not scan repository.");
        return;
      }
      setProjects((current) => [data.project, ...current.filter((project) => project.id !== data.project.id)]);
      setRepositoryUrl("");
      setMessage("Repository scanned and project saved.");
    } catch {
      setMessage("Could not reach GitHub.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/projects?id=" + encodeURIComponent(id), { method: "DELETE" });
    setProjects((current) => current.filter((project) => project.id !== id));
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="projects" />
        <header className="account-head">
          <div>
            <div className="account-kicker">PROJECTS / 03</div>
            <h1 className="account-title">Turn repositories into portfolio entries.</h1>
            <p className="account-copy">Paste a public GitHub repository. JoBrain reads its metadata, languages, package dependencies, README and live-demo hints, then saves a recruiter-ready project card.</p>
          </div>
          <Link className="account-button" href="/profile">Profile →</Link>
        </header>

        <section className="account-card account-card-wide">
          <h2>Repository scanner</h2>
          <label className="account-field">
            <span>GitHub repository</span>
            <input value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} placeholder="https://github.com/owner/repository" />
          </label>
          <div className="account-actions">
            <button className="account-button account-button-primary" type="button" disabled={loading || !repositoryUrl.trim()} onClick={() => void scan()}>
              {loading ? "Scanning…" : "Scan & submit"}
            </button>
          </div>
          {message ? <p className="account-muted">{message}</p> : null}
        </section>

        <div className="project-grid">
          {projects.map((project) => {
            const languages = Object.entries(project.languages ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
            return (
              <article className="project-card" key={project.id}>
                <h3>{project.name}</h3>
                <p>{project.description || "No GitHub description."}</p>
                <div className="project-links">
                  <a href={project.repositoryUrl} target="_blank" rel="noreferrer">Repository ↗</a>
                  {project.liveUrl ? <a href={project.liveUrl} target="_blank" rel="noreferrer">Live demo ↗</a> : null}
                </div>
                <div className="project-tech">
                  {languages.map(([language]) => <span key={language}>{language}</span>)}
                  {(project.technologies ?? []).slice(0, 8).map((technology) => <span key={technology}>{technology}</span>)}
                </div>
                <div className="account-actions">
                  <button className="account-button" type="button" onClick={() => void remove(project.id)}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
