"use client";

import {
  Clock3,
  ExternalLink,
  Layers3,
  LayoutDashboard,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import PatternWaves from "@components/PatternWaves";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "FOUND" | "APPLIED" | "SCREENING" | "TECH" | "OFFER" | "REJECTED";
type App = {
  id: string;
  company: string;
  role: string;
  url: string | null;
  source: string;
  status: Status;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  notes: string | null;
  appliedAt: string | null;
  nextActionAt: string | null;
  updatedAt: string;
};

type Job = {
  id: string;
  source: "remoteok" | "remotive" | "jobicy" | "adzuna" | "googlejobs";
  platform: string;
  level: "intern" | "junior" | "mid" | "senior" | "lead" | null;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  tags: string[];
  salary?: string;
  postedAt: string;
};

type JobResponse = {
  jobs: Job[];
  sources: Record<string, "ok" | "error">;
  fetchedAt: string;
};

const stages: Array<{ key: Status; label: string; tone: string }> = [
  { key: "FOUND", label: "Found", tone: "jb-stage-found" },
  { key: "APPLIED", label: "Applied", tone: "jb-stage-applied" },
  { key: "SCREENING", label: "Screening", tone: "jb-stage-screening" },
  { key: "TECH", label: "Technical", tone: "jb-stage-tech" },
  { key: "OFFER", label: "Offer", tone: "jb-stage-offer" },
  { key: "REJECTED", label: "Rejected", tone: "jb-stage-rejected" },
];

const sourceLabel: Record<string, string> = {
  remoteok: "Remote OK",
  remotive: "Remotive",
  jobicy: "Jobicy",
  adzuna: "Adzuna US",
  googlejobs: "Google Jobs",
  REMOTEOK: "Remote OK",
  REMOTIVE: "Remotive",
  COMPANY_SITE: "Company",
  LINKEDIN: "LinkedIn",
  OTHER: "Other",
}; 

const AUTOFILL_GITHUB_URL = "https://github.com/b-1-o/autofill";
const AUTOFILL_DOWNLOAD_URL =
  "https://github.com/b-1-o/autofill/archive/refs/heads/main.zip";

const navItems: Array<{
  key: "overview" | "search" | "pipeline";
  label: string;
  icon: LucideIcon;
}> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "search", label: "Search", icon: Search },
  { key: "pipeline", label: "Pipeline", icon: Layers3 },
];

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}

function levelLabel(level: Job["level"]) {
  if (level === "intern") return "Intern / Entry";
  if (level === "junior") return "Junior";
  if (level === "mid") return "Mid";
  if (level === "senior") return "Senior";
  if (level === "lead") return "Lead / Staff";
  return "Any level";
}

function platformName(platform: string) {
  const labels: Record<string, string> = {
    linkedin: "LinkedIn",
    indeed: "Indeed",
    glassdoor: "Glassdoor",
    ziprecruiter: "ZipRecruiter",
    dice: "Dice",
    company: "Company",
    remoteok: "Remote OK",
    remotive: "Remotive",
    jobicy: "Jobicy",
    adzuna: "Adzuna US",
    other: "Other",
  };

  return labels[platform] ?? platform;
}

export default function Home() {
  const [tab, setTab] = useState<"overview" | "search" | "pipeline">("overview");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("jobrain-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  const [apps, setApps] = useState<App[]>([]);
  const [jobQuery, setJobQuery] = useState("frontend");
  const [location, setLocation] = useState("");
  const [platform, setPlatform] = useState("all");
  const [experience, setExperience] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [error, setError] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("jobrain-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const changeTab = useCallback(
    (nextTab: "overview" | "search" | "pipeline") => {
      if (nextTab === tab) return;

      const transitionDocument = document as Document & {
        startViewTransition?: (callback: () => void) => {
          finished: Promise<void>;
        };
      };

      if (transitionDocument.startViewTransition) {
        transitionDocument.startViewTransition(() => setTab(nextTab));
      } else {
        setTab(nextTab);
      }
    },
    [tab],
  );

  const jobSearchKey = useMemo(
    () => ["jobs", jobQuery, location, platform, experience, remoteOnly] as const,
    [jobQuery, location, platform, experience, remoteOnly],
  );

  const {
    data: jobData,
    isFetching: loadingJobs,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery<JobResponse>({
    queryKey: jobSearchKey,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        query: jobQuery,
        location,
        source: "all",
        platform,
        experience,
        remote: String(remoteOnly),
        limit: "120",
      });

      const response = await fetch("/api/jobs?" + params.toString(), {
        cache: "no-store",
        signal,
      });

      if (!response.ok) throw new Error("search");
      return response.json() as Promise<JobResponse>;
    },
    enabled: Boolean(jobQuery.trim()),
  });

  const jobs = jobData?.jobs ?? [];
  const lastFetched = jobData?.fetchedAt ?? null;
  const sourceState = jobData?.sources ?? {};
  const displayError = error || (jobsError ? "Live search is temporarily unavailable." : "");


  const stats = useMemo(() => {
    const applied = apps.filter((item) => item.status !== "FOUND").length;
    const offers = apps.filter((item) => item.status === "OFFER").length;
    const interviews = apps.filter((item) => ["SCREENING", "TECH", "OFFER"].includes(item.status)).length;
    const active = apps.filter((item) => !["REJECTED", "OFFER"].includes(item.status)).length;
    return {
      total: apps.length,
      active,
      interviews,
      offers,
      applied,
      offerRate: applied ? Math.round((offers / applied) * 100) : 0,
      rejectionRate: applied
        ? Math.round((apps.filter((item) => item.status === "REJECTED").length / applied) * 100)
        : 0,
    };
  }, [apps]);

  const funnel = useMemo(
    () =>
      stages.map((stage, index) => ({
        ...stage,
        count: apps.filter((item) => item.status === stage.key).length,
        opacity: 1 - index * 0.07,
      })),
    [apps],
  );

  const insight = useMemo(() => {
    if (!apps.length) return "Start by loading demo data or tracking a live role. JoBrain will reveal the conversion pattern as soon as there is enough data.";
    if (stats.offers > 0) return "You have active leverage in the funnel. Keep every interview and offer tied to a concrete next action.";
    if (stats.rejectionRate >= 60) return "The funnel is losing roles late. Review role-fit, tailoring, and interview conversion before increasing application volume.";
    if (stats.applied > 0 && stats.interviews === 0) return "Applications are not reaching interviews yet. Tighten targeting and make the top third of your resume mirror the role.";
    return "The pipeline is moving. Keep the discovery layer full while scheduling the next action for every active application.";
  }, [apps.length, stats]);

  async function addApplication(job: Job) {
    const sourceValue =
      job.platform === "linkedin"
        ? "LINKEDIN"
        : job.platform === "indeed"
          ? "INDEED"
          : job.platform === "remotive"
            ? "REMOTIVE"
            : job.platform === "remoteok"
              ? "REMOTEOK"
              : "OTHER";

    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: job.company,
        role: job.title,
        url: job.url,
        source: sourceValue,
        status: "FOUND",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setApps((current) => [data.application, ...current]);
      toast.success("Role added to the pipeline.");
      changeTab("pipeline");
    } else {
      const message = "Could not track this role.";
      setError(message);
      toast.error(message);
    }
  }

  async function updateStatus(id: string, status: Status) {
    const body: { id: string; status: Status; appliedAt?: string } = { id, status };
    if (status === "APPLIED") body.appliedAt = new Date().toISOString();

    const response = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setApps((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                appliedAt: status === "APPLIED" ? new Date().toISOString() : item.appliedAt,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    }
  }

  async function createManualApplication() {
    if (!manualCompany.trim() || !manualRole.trim()) return;

    setManualLoading(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: manualCompany.trim(),
          role: manualRole.trim(),
          source: "OTHER",
          status: "FOUND",
        }),
      });

      if (!response.ok) throw new Error("manual");
      const data = await response.json();
      setApps((current) => [data.application, ...current]);
      toast.success("Role added to the pipeline.");
      setManualCompany("");
      setManualRole("");
    } catch {
      setError("Could not add the application.");
      toast.error("Could not add the application.");
    } finally {
      setManualLoading(false);
    }
  }

  async function deleteApplication(id: string) {
    const response = await fetch("/api/applications?id=" + encodeURIComponent(id), {
      method: "DELETE",
    });

    if (response.ok) {
      setApps((current) => current.filter((item) => item.id !== id));
      toast.success("Application removed.");
    } else {
      setError("Could not remove the application.");
      toast.error("Could not remove the application.");
    }
  }

  function resetFilters() {
    setJobQuery("frontend");
    setLocation("");
    setPlatform("all");
    setExperience("all");
    setRemoteOnly(false);
  }


  return (
    <main className="jb-shell">
      <PatternWaves
        preset="silk"
        color={theme === "dark" ? "#ffffff" : "#000000"}
        backgroundColor={theme === "dark" ? "#050607" : "#dfdfdf"}
        fade="edges"
        interactive
        cursorSize={50}
        cursorStrength={0.6}
        markSize={theme === "dark" ? 0.95 : 1}
        shine={theme === "dark" ? 0.15 : 0.75}
        opacity={1}
        className="jb-pattern-waves"
      />
      <header className="jb-topbar">
        <div className="jb-topbar-inner">
          <button type="button" className="jb-brand" onClick={() => changeTab("overview")} aria-label="JoBrain home">
            <span className="jb-brand-mark">JB</span>
            <span className="jb-brand-word">JOBRAIN</span>
            <span className="jb-brand-index">/ 01</span>
          </button>

          <nav className="jb-nav" aria-label="Primary">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={"jb-nav-item " + (tab === item.key ? "is-active" : "")}
                onClick={() => changeTab(item.key)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="jb-topbar-tools">
            <button
              type="button"
              className="jb-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
            <div className="jb-topbar-status">
              <span className="jb-status-dot" />
              <span>{loadingJobs ? "SYNCING" : "LIVE"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="jb-page">
        {displayError ? (
          <div className="jb-alert" role="alert">
            <span>{displayError}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        ) : null}

        <div key={tab} className="jb-view-transition">\n        {tab === "overview" ? (
          <section className="jb-overview">
            <div className="jb-hero">
              <div className="jb-hero-copy">
                <div className="jb-eyebrow">
                  <span className="jb-eyebrow-line" />
                  JOB SEARCH / 01
                </div>
                <h1>
                  Find work.
                  <span>Not another spreadsheet.</span>
                </h1>
                <p>
                  Fresh roles, one application memory, and a funnel you can actually read.
                  Search the market, track the signal, and move without losing context.
                </p>
                <div className="jb-hero-actions">
                  <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                    Explore live roles
                    <span>↗</span>
                  </button>
                  <button type="button" className="jb-button jb-button-ghost" onClick={() => changeTab("pipeline")}>
                    Open pipeline
                  </button>
                  <button type="button" className="jb-icon-button" onClick={() => void refetchJobs()} aria-label="Refresh live jobs">
                    <RefreshCw size={15} className={loadingJobs ? "jb-spin" : ""} />
                  </button>
                </div>
              </div>

              <div className="jb-signal">
                <div className="jb-section-meta">
                  <span>FUNNEL SIGNAL</span>
                  <span>{stats.total.toString().padStart(2, "0")} TRACKED</span>
                </div>
                <div className="jb-signal-rail">
                  {funnel.map((item, index) => {
                    const max = Math.max(...funnel.map((entry) => entry.count), 1);
                    const width = item.count ? Math.max((item.count / max) * 100, 12) : 4;
                    return (
                      <div key={item.key} className="jb-signal-step">
                        <div className="jb-signal-label">
                          <span className={item.tone}>{String(index + 1).padStart(2, "0")}</span>
                          <span>{item.label}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="jb-signal-track">
                          <span style={{ width: width + "%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="jb-signal-foot">
                  <span>OFFER RATE {stats.offerRate}%</span>
                  <span>{lastFetched ? "SYNC " + relativeTime(lastFetched).toUpperCase() : "AWAITING SYNC"}</span>
                </div>
              </div>
            </div>

            <div className="jb-metrics">
              <div><span>TRACKED</span><strong>{stats.total}</strong><small>Total roles</small></div>
              <div><span>ACTIVE</span><strong>{stats.active}</strong><small>Still moving</small></div>
              <div><span>INTERVIEWS</span><strong>{stats.interviews}</strong><small>Screen + technical</small></div>
              <div><span>OFFERS</span><strong>{stats.offers}</strong><small>{stats.offerRate}% of applied</small></div>
              <div><span>REJECTED</span><strong>{stats.rejectionRate}%</strong><small>Of applied outcomes</small></div>
            </div>

            <div className="jb-content-grid">
              <section className="jb-panel jb-funnel-panel">
                <div className="jb-panel-head">
                  <div>
                    <span className="jb-kicker">APPLICATION FUNNEL</span>
                    <h2>Keep the whole funnel visible.</h2>
                  </div>
                  <span className="jb-panel-index">A / 01</span>
                </div>
                <div className="jb-spatial-funnel">
                  <div className="jb-spatial-line" />
                  {funnel.map((item, index) => (
                    <div key={item.key} className={"jb-stage-node " + item.tone}>
                      <div className="jb-node-top">
                        <span>0{index + 1}</span>
                        <span>{item.label}</span>
                      </div>
                      <div className="jb-node-dot" />
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
                <div className="jb-panel-caption">
                  {insight}
                </div>
              </section>

              <section className="jb-panel jb-autofill-panel">
                <div className="jb-panel-head">
                  <div>
                    <span className="jb-kicker">COMPANION / 02</span>
                    <h2>From role to application.</h2>
                  </div>
                  <span className="jb-panel-index">EXT</span>
                </div>
                <div className="jb-autofill-copy">
                  <p>Autofill is the shortest path from discovery to a reviewed application form.</p>
                  <div className="jb-meta-row">
                    <span>MANIFEST V3</span>
                    <span>REVIEW FIRST</span>
                    <span>LOCAL PROFILE</span>
                  </div>
                </div>
                <div className="jb-autofill-actions">
                  <a className="jb-button jb-button-solid" href={AUTOFILL_DOWNLOAD_URL}>
                    Download extension
                    <span>↓</span>
                  </a>
                  <a className="jb-button jb-button-ghost" href={AUTOFILL_GITHUB_URL} target="_blank" rel="noreferrer">
                    View source
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div className="jb-autofill-foot">
                  Chrome Web Store install becomes a one-click action once the extension is published.
                </div>
              </section>
            </div>

            <section className="jb-recent">
              <div className="jb-panel-head jb-recent-head">
                <div>
                  <span className="jb-kicker">RECENT MOVES / 03</span>
                  <h2>What is moving right now.</h2>
                </div>
                <button type="button" className="jb-text-link" onClick={() => changeTab("pipeline")}>
                  Open pipeline ↗
                </button>
              </div>

              {!apps.length ? (
                <div className="jb-empty-wide">
                  <span className="jb-empty-number">00</span>
                  <div>
                    <strong>No tracked roles yet.</strong>
                    <p>Load demo data or open Live Search to start building the funnel.</p>
                  </div>
                  <button type="button" className="jb-text-link" onClick={() => changeTab("search")}>Find roles ↗</button>
                </div>
              ) : (
                <div className="jb-recent-list">
                  {apps.slice(0, 5).map((app, index) => (
                    <div key={app.id} className="jb-recent-row">
                      <span className="jb-row-index">0{index + 1}</span>
                      <div className="jb-row-main">
                        <strong>{app.role}</strong>
                        <span>{app.company} · {sourceLabel[app.source] ?? app.source}</span>
                      </div>
                      <span className={"jb-status " + app.status.toLowerCase()}>{app.status}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="jb-system-strip">
                <span>SOURCES</span>
                <div className="jb-source-strip">
                  {["googlejobs", "remoteok", "remotive", "jobicy", "adzuna"].map((name) => (
                    <span key={name}>
                      <i className={sourceState[name] === "error" ? "is-error" : sourceState[name] === "ok" ? "is-ok" : ""} />
                      {sourceLabel[name]}
                    </span>
                  ))}
                </div>
                <span>{lastFetched ? "LAST SYNC " + relativeTime(lastFetched).toUpperCase() : "AWAITING FIRST SYNC"}</span>
              </div>
            </section>
          </section>
        ) : null}

        {tab === "search" ? (
          <section className="jb-search-page">
            <div className="jb-search-hero">
              <div>
                <span className="jb-eyebrow">
                  <span className="jb-eyebrow-line" />
                  SEARCH / 02
                </span>
                <h1>Find your next role.</h1>
                <p>One search across multiple live sources, with the filters and context you need to move quickly.</p>
              </div>
              <div className="jb-search-counter">
                <strong>{loadingJobs ? "…" : jobs.length}</strong>
                <span>ROLES FOUND</span>
              </div>
            </div>

            <div className="jb-command">
              <div className="jb-command-top" aria-busy={loadingJobs}>
                <Search size={17} />
                <input
                  value={jobQuery}
                  onChange={(event) => setJobQuery(event.target.value)}
                  placeholder="Search jobs, skills, companies…"
                  aria-label="Search jobs"
                />
                <span className="jb-search-hint">LIVE</span>
              </div>
              <div className="jb-command-filters">
                <label>
                  <span>LOCATION</span>
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Los Angeles, US" />
                </label>
                <label>
                  <span>PLATFORM</span>
                  <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                    <option value="all">All platforms</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="indeed">Indeed</option>
                    <option value="glassdoor">Glassdoor</option>
                    <option value="ziprecruiter">ZipRecruiter</option>
                    <option value="dice">Dice</option>
                    <option value="company">Company sites</option>
                    <option value="remoteok">Remote OK</option>
                    <option value="remotive">Remotive</option>
                    <option value="jobicy">Jobicy</option>
                    <option value="adzuna">Adzuna US</option>
                  </select>
                </label>
                <label>
                  <span>LEVEL</span>
                  <select value={experience} onChange={(event) => setExperience(event.target.value)}>
                    <option value="all">Any level</option>
                    <option value="intern">Intern / Entry</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead / Staff</option>
                  </select>
                </label>
                <button type="button" className={"jb-command-toggle " + (remoteOnly ? "is-on" : "")} onClick={() => setRemoteOnly((value) => !value)}>
                  <span>Remote only</span>
                  <i />
                </button>
              </div>
              <div className="jb-command-quick">
                {([
                  ["all", "All"],
                  ["intern", "Intern"],
                  ["junior", "Junior"],
                  ["mid", "Mid"],
                  ["senior", "Senior"],
                  ["lead", "Lead"],
                ] as Array<[string, string]>).map(([value, label]) => (
                  <button key={value} type="button" className={experience === value ? "is-active" : ""} onClick={() => setExperience(value)}>
                    {label}
                  </button>
                ))}
                <button type="button" className="jb-command-reset" onClick={resetFilters}>Reset</button>
              </div>
            </div>

            <div className="jb-results-head">
              <span>{loadingJobs ? "Searching live sources…" : "Latest matching roles"}</span>
              <span>{lastFetched ? "UPDATED " + relativeTime(lastFetched).toUpperCase() : "LIVE SOURCES"}</span>
            </div>

            <div className="jb-job-list">
              {jobs.map((job, index) => (
                <article key={job.id} className="jb-job-row">
                  <div className="jb-job-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="jb-job-main">
                    <div className="jb-job-overline">
                      <span>{platformName(job.platform)}</span>
                      {job.remote ? <span>REMOTE</span> : null}
                      {job.level ? <span>{levelLabel(job.level)}</span> : null}
                    </div>
                    <h2>{job.title}</h2>
                    <div className="jb-job-company">{job.company}</div>
                    <div className="jb-job-meta">
                      <span><MapPin size={12} />{job.location || "Remote"}</span>
                      <span><Clock3 size={12} />{relativeTime(job.postedAt)}</span>
                      {job.salary ? <span className="jb-job-salary">{job.salary}</span> : null}
                    </div>
                    <p>{job.description || "No description returned by source."}</p>
                    <div className="jb-tags">
                      {job.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                  <div className="jb-job-actions">
                    <a href={job.url} target="_blank" rel="noreferrer" className="jb-open-link">
                      Open <ExternalLink size={13} />
                    </a>
                    <button type="button" className="jb-track-button" onClick={() => void addApplication(job)}>
                      Track
                      <Plus size={14} />
                    </button>
                  </div>
                </article>
              ))}

              {!jobs.length && !loadingJobs ? (
                <div className="jb-empty-search">
                  <span>00</span>
                  <strong>No roles matched this view.</strong>
                  <p>Broaden the query or reset the filters.</p>
                  <button type="button" className="jb-button jb-button-ghost" onClick={resetFilters}>Reset filters</button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "pipeline" ? (
          <section className="jb-pipeline-page">
            <div className="jb-pipeline-hero">
              <div>
                <span className="jb-eyebrow">
                  <span className="jb-eyebrow-line" />
                  PIPELINE / 03
                </span>
                <h1>Your job search, in motion.</h1>
                <p>Every role has a state. Every active state should have a next action.</p>
              </div>
              <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                Find new roles
                <span>↗</span>
              </button>
            </div>

            <div className="jb-pipeline-signal">
              {funnel.map((item, index) => (
                <div key={item.key} className={"jb-pipeline-signal-item " + item.tone}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.count}</strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>

            <section className="jb-quick-add">
              <div>
                <span className="jb-kicker">QUICK ADD / 04</span>
                <h2>Bring in a role from anywhere.</h2>
              </div>
              <div className="jb-quick-add-fields">
                <input value={manualCompany} onChange={(event) => setManualCompany(event.target.value)} placeholder="Company" />
                <input value={manualRole} onChange={(event) => setManualRole(event.target.value)} placeholder="Role" />
                <button
                  type="button"
                  className="jb-button jb-button-solid"
                  onClick={() => void createManualApplication()}
                  disabled={manualLoading || !manualCompany.trim() || !manualRole.trim()}
                >
                  {manualLoading ? <Loader2 size={14} className="jb-spin" /> : <Plus size={14} />}
                  Add role
                </button>
              </div>
            </section>

            <div className="jb-pipeline-grid">
              {stages.map((stage) => {
                const items = apps.filter((app) => app.status === stage.key);
                return (
                  <section key={stage.key} className={"jb-pipeline-column " + stage.tone}>
                    <div className="jb-column-head">
                      <div>
                        <span>{stage.label}</span>
                        <strong>{String(items.length).padStart(2, "0")}</strong>
                      </div>
                      <span className="jb-column-line" />
                    </div>
                    <div className="jb-column-items">
                      {items.map((app, index) => (
                        <article key={app.id} className="jb-pipeline-item">
                          <div className="jb-pipeline-item-top">
                            <span>0{index + 1}</span>
                            <button type="button" onClick={() => void deleteApplication(app.id)} aria-label={"Delete " + app.company + " application"}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <h3>{app.role}</h3>
                          <p>{app.company}</p>
                          <span>{sourceLabel[app.source] ?? app.source}</span>
                          <select value={app.status} onChange={(event) => void updateStatus(app.id, event.target.value as Status)} aria-label={"Move " + app.company + " application"}>
                            {stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                        </article>
                      ))}
                      {!items.length ? <div className="jb-column-empty">—</div> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : null}
        </div>
      </div>
    </main>
  );
}
