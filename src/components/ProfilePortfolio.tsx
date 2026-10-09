"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Code2, ExternalLink, Github, Layers3, Sparkles } from "lucide-react";

type PortfolioProject = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  liveUrl: string | null;
  languages: Record<string, number> | null;
  technologies: string[] | null;
};

type LanguageMetric = {
  name: string;
  bytes: number;
  projectCount: number;
  share: number;
};

type TechnologyMetric = {
  name: string;
  projectCount: number;
  share: number;
};

const LANGUAGE_TONES = ["#e7edf1", "#b5c6d1", "#879eac", "#617b8b", "#9babb5", "#d1dbe1"];

function projectLanguages(project: PortfolioProject): Array<[string, number]> {
  return Object.entries(project.languages ?? {})
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
}

function repositoryLabel(value: string): string {
  try {
    return new URL(value).pathname.replace(/^\\/+|\\/+$/g, "");
  } catch {
    return value;
  }
}

export default function ProfilePortfolio() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/projects", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          error?: unknown;
          projects?: unknown;
        };
        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not load projects (HTTP " + response.status + ").",
          );
        }
        const next = Array.isArray(data.projects) ? (data.projects as PortfolioProject[]) : [];
        if (!cancelled) setProjects(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your portfolio.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const languageStats = useMemo<LanguageMetric[]>(() => {
    const totals = new Map<string, { bytes: number; projects: Set<string> }>();
    projects.forEach((project) => {
      projectLanguages(project).forEach(([name, bytes]) => {
        const metric = totals.get(name) ?? { bytes: 0, projects: new Set<string>() };
        metric.bytes += bytes;
        metric.projects.add(project.id);
        totals.set(name, metric);
      });
    });

    const totalBytes = Array.from(totals.values()).reduce((sum, metric) => sum + metric.bytes, 0);
    return Array.from(totals.entries())
      .map(([name, metric]) => ({
        name,
        bytes: metric.bytes,
        projectCount: metric.projects.size,
        share: totalBytes > 0 ? (metric.bytes / totalBytes) * 100 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);
  }, [projects]);

  const technologyStats = useMemo<TechnologyMetric[]>(() => {
    if (projects.length === 0) return [];

    const languageNames = new Set(
      projects.flatMap((project) => projectLanguages(project).map(([name]) => name.trim().toLowerCase())),
    );
    const totals = new Map<string, { name: string; projects: Set<string> }>();

    projects.forEach((project) => {
      const unique = new Map<string, string>();
      (Array.isArray(project.technologies) ? project.technologies : []).forEach((technology) => {
        if (typeof technology !== "string") return;
        const name = technology.trim();
        const key = name.toLowerCase();
        if (!name || languageNames.has(key)) return;
        unique.set(key, name);
      });

      unique.forEach((name, key) => {
        const metric = totals.get(key) ?? { name, projects: new Set<string>() };
        metric.projects.add(project.id);
        totals.set(key, metric);
      });
    });

    return Array.from(totals.values())
      .map((metric) => ({
        name: metric.name,
        projectCount: metric.projects.size,
        share: (metric.projects.size / projects.length) * 100,
      }))
      .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));
  }, [projects]);

  return (
    <section className="portfolio-showcase" aria-labelledby="portfolio-heading">
      <div className="portfolio-section-head">
        <div>
          <div className="account-kicker">PORTFOLIO / 02</div>
          <h2 id="portfolio-heading">Selected work, in context.</h2>
          <p>Real projects from your saved repositories, with language distribution and the stack behind each build.</p>
        </div>
        <Link className="account-button account-button-primary" href="/projects">
          Manage projects <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="portfolio-metrics" aria-label="Portfolio summary">
        <div className="portfolio-metric">
          <span>PROJECTS</span>
          <strong>{String(projects.length).padStart(2, "0")}</strong>
          <small>Saved repositories</small>
        </div>
        <div className="portfolio-metric">
          <span>LANGUAGES</span>
          <strong>{String(languageStats.length).padStart(2, "0")}</strong>
          <small>Detected in code</small>
        </div>
        <div className="portfolio-metric">
          <span>STACK ITEMS</span>
          <strong>{String(technologyStats.length).padStart(2, "0")}</strong>
          <small>Frameworks and tools</small>
        </div>
      </div>

      {loading ? (
        <div className="portfolio-project-grid" aria-label="Loading projects">
          <div className="portfolio-skeleton" />
          <div className="portfolio-skeleton" />
        </div>
      ) : error ? (
        <div className="portfolio-empty" role="alert">
          <span className="portfolio-empty-icon"><Code2 size={20} /></span>
          <div>
            <h3>Projects could not be loaded</h3>
            <p>{error}</p>
          </div>
          <Link className="account-button" href="/projects">Open project manager</Link>
        </div>
      ) : projects.length === 0 ? (
        <div className="portfolio-empty">
          <span className="portfolio-empty-icon"><Sparkles size={20} /></span>
          <div>
            <h3>Your work belongs here.</h3>
            <p>Connect a public GitHub repository to build a portfolio that shows what you made and the technologies you used.</p>
          </div>
          <Link className="account-button account-button-primary" href="/projects">
            Add your first project <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className="portfolio-project-grid">
            {projects.map((project, projectIndex) => {
              const languages = projectLanguages(project);
              const totalBytes = languages.reduce((sum, entry) => sum + entry[1], 0);
              const technologies = Array.from(new Set(
                (Array.isArray(project.technologies) ? project.technologies : [])
                  .filter((technology): technology is string => typeof technology === "string")
                  .map((technology) => technology.trim())
                  .filter(Boolean),
              ));

              return (
                <article className="portfolio-project-card" key={project.id}>
                  <div className="portfolio-project-topline">
                    <span className="portfolio-project-index">{String(projectIndex + 1).padStart(2, "0")}</span>
                    <span className="portfolio-project-source"><Github size={12} /> GITHUB REPOSITORY</span>
                  </div>
                  <h3>{project.name}</h3>
                  <p className="portfolio-project-description">{project.description || "A saved project from your GitHub portfolio."}</p>

                  {languages.length > 0 && totalBytes > 0 ? (
                    <div className="portfolio-project-language">
                      <div className="portfolio-minor-heading">
                        <span>LANGUAGE MIX</span>
                        <span>{languages.length} detected</span>
                      </div>
                      <div className="portfolio-language-stack" role="img" aria-label={"Language distribution for " + project.name}>
                        {languages.map(([language, bytes], index) => (
                          <span
                            key={language}
                            title={language + ": " + ((bytes / totalBytes) * 100).toFixed(1) + "%"}
                            style={{
                              width: String((bytes / totalBytes) * 100) + "%",
                              background: LANGUAGE_TONES[index % LANGUAGE_TONES.length],
                            }}
                          />
                        ))}
                      </div>
                      <div className="portfolio-language-legend">
                        {languages.slice(0, 4).map(([language, bytes]) => (
                          <span key={language}>
                            <i />
                            {language}
                            <strong>{((bytes / totalBytes) * 100).toFixed(1)}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="portfolio-no-languages">Language metadata is not available for this repository.</div>
                  )}

                  {technologies.length > 0 ? (
                    <div className="portfolio-technology-tags">
                      {technologies.slice(0, 6).map((technology) => <span key={technology}>{technology}</span>)}
                      {technologies.length > 6 ? <span>+{technologies.length - 6}</span> : null}
                    </div>
                  ) : null}

                  <div className="portfolio-project-footer">
                    <span title={project.repositoryUrl}>{repositoryLabel(project.repositoryUrl)}</span>
                    <div>
                      <a href={project.repositoryUrl} target="_blank" rel="noreferrer" aria-label={"Open " + project.name + " repository"}>
                        <Github size={15} /> Repository <ExternalLink size={12} />
                      </a>
                      {project.liveUrl ? (
                        <a href={project.liveUrl} target="_blank" rel="noreferrer" aria-label={"Open live demo for " + project.name}>
                          <ArrowUpRight size={15} /> Live demo
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="portfolio-insights">
            <section className="portfolio-data-panel">
              <div className="portfolio-data-head">
                <span className="portfolio-data-icon"><Code2 size={17} /></span>
                <div>
                  <h3>Language distribution</h3>
                  <p>Share of GitHub-reported code bytes across your saved repositories.</p>
                </div>
              </div>
              {languageStats.length > 0 ? (
                <div className="portfolio-table-scroll">
                  <table className="portfolio-data-table">
                    <thead><tr><th scope="col">Language</th><th scope="col">Projects</th><th scope="col">Code share</th></tr></thead>
                    <tbody>
                      {languageStats.map((language) => (
                        <tr key={language.name}>
                          <th scope="row">{language.name}</th>
                          <td>{language.projectCount}</td>
                          <td>
                            <div className="portfolio-share-value">
                              <span className="portfolio-share-track"><i style={{ width: String(language.share) + "%" }} /></span>
                              <strong>{language.share.toFixed(1)}%</strong>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="portfolio-table-empty">No language data is available yet.</p>
              )}
            </section>

            <section className="portfolio-data-panel">
              <div className="portfolio-data-head">
                <span className="portfolio-data-icon"><Layers3 size={17} /></span>
                <div>
                  <h3>Technology adoption</h3>
                  <p>Percentage of projects that list each detected framework, library, or tool.</p>
                </div>
              </div>
              {technologyStats.length > 0 ? (
                <div className="portfolio-table-scroll">
                  <table className="portfolio-data-table">
                    <thead><tr><th scope="col">Technology</th><th scope="col">Projects</th><th scope="col">Portfolio share</th></tr></thead>
                    <tbody>
                      {technologyStats.map((technology) => (
                        <tr key={technology.name}>
                          <th scope="row">{technology.name}</th>
                          <td>{technology.projectCount} / {projects.length}</td>
                          <td>
                            <div className="portfolio-share-value">
                              <span className="portfolio-share-track"><i style={{ width: String(technology.share) + "%" }} /></span>
                              <strong>{technology.share.toFixed(1)}%</strong>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="portfolio-table-empty">No framework or tool metadata was detected yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
