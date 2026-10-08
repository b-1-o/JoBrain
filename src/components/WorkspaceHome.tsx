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
  Settings,
  UserRound,
  Trash2,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import PatternWaves from "@components/PatternWaves";
import JobResultsList from "@/components/JobResultsList";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export default function WorkspaceHome() {
  const [tab, setTab] = useState<"overview" | "search" | "pipeline">("overview");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("jobrain-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  const [apps, setApps] = useState<App[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobQuery, setJobQuery] = useState("");
  const [location, setLocation] = useState("");
  const [platform, setPlatform] = useState("all");
  const [experience, setExperience] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [sourceState, setSourceState] = useState<Record<string, "ok" | "error">>({});
  const [error, setError] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("jobrain-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/applications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("applications");
        return (await response.json()) as { applications?: App[] };
      })
      .then((data) => {
        if (!cancelled) setApps(Array.isArray(data.applications) ? data.applications : []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load saved applications.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const changeTab = useCallback(
    (nextTab: "overview" | "search" | "pipeline") => {
      if (nextTab !== tab) setTab(nextTab);
    },
    [tab],
  );

  const searchJobs = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingJobs(true);
    setError("");
    try {
      const params = new URLSearchParams({
        query: jobQuery,
        location,
        source: "all",
        platform,
        experience,
        remote: String(remoteOnly),
        limit: "36",
      });
      const response = await fetch("/api/jobs?" + params.toString(), {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("search");
      const data = (await response.json()) as JobResponse;
      setJobs(data.jobs);
      setSourceState(data.sources);
      setLastFetched(data.fetchedAt);
      void fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SEARCH",
          title: jobQuery.trim(),
          metadata: { location, platform, experience, remoteOnly },
        }),
      }).catch(() => undefined);
    } catch (value) {
      if (value instanceof DOMException && value.name === "AbortError") return;
      setError("Live search is temporarily unavailable.");
    } finally {
      if (!controller.signal.aborted) setLoadingJobs(false);
    }
  }, [jobQuery, location, platform, experience, remoteOnly]);

  useEffect(() => {
    abortRef.current?.abort();
    if (!jobQuery.trim()) return;
    const timer = window.setTimeout(() => void searchJobs(), 450);
    return () => window.clearTimeout(timer);
  }, [jobQuery, location, platform, experience, remoteOnly, searchJobs]);

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
      changeTab("pipeline");
    } else {
      setError("Could not track this role.");
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
      setManualCompany("");
      setManualRole("");
    } catch {
      setError("Could not add the application.");
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
    } else {
      setError("Could not remove the application.");
    }
  }

  function clearSearchResults() {
    abortRef.current?.abort();
    setJobs([]);
    setSourceState({});
    setLastFetched(null);
    setLoadingJobs(false);
  }

  function handleJobQueryChange(value: string) {
    setJobQuery(value);
    if (!value.trim()) clearSearchResults();
  }

  function resetFilters() {
    setJobQuery("");
    clearSearchResults();
    setLocation("");
    setPlatform("all");
    setExperience("all");
    setRemoteOnly(false);
  }

  return (
    <main className="jb-shell">
      {theme === "light" ? (
        <PatternWaves
          preset="silk"
          color="#000000"
          backgroundColor="#d3d3d3"
          fade="edges"
          interactive={false}
          markSize={0.8}
          shine={0.5}
          contrast={1}
          speed={0.08}
          scale={1}
          direction={20}
          opacity={0.28}
          className="jb-pattern-waves"
        />
      ) : null}
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
            <div className="jb-account-shortcuts" aria-label="Account">
              <Link href="/profile" className="jb-account-shortcut" title="Profile">
                <UserRound size={14} />
              </Link>
              <Link href="/settings" className="jb-account-shortcut" title="Settings">
                <Settings size={14} />
              </Link>
            </div>
            <Show when="signed-out">
              <div className="jb-auth-controls" aria-label="Account">
                <Link href="/sign-in" className="jb-auth-link">
                  Sign in
                </Link>
                <Link href="/sign-up" className="jb-auth-link jb-auth-link-primary">
                  Create account
                </Link>
              </div>
            </Show>
            <Show when="signed-in">
              <div className="jb-auth-user">
                <UserButton appearance={{ elements: { avatarBox: "jb-auth-avatar" } }} />
              </div>
            </Show>
          </div>
        </div>
      </header>
      <div className="jb-page">
        {error ? (
          <div className="jb-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        ) : null}
        <div className="jb-view-transition">
          {tab === "search" ? (
            <section className="jb-search-page">
              <div className="jb-command">
                <div className="jb-command-search">
                  <Search size={16} />
                  <input
                    value={jobQuery}
                    onChange={(event) => handleJobQueryChange(event.target.value)}
                    placeholder="Search jobs, skills, companies…"
                    aria-label="Search jobs"
                  />
                  <span className="jb-search-hint">LIVE</span>
                </div>
              </div>
              <div className="jb-results-head">
                <span>{loadingJobs ? "Searching live sources…" : "Latest matching roles"}</span>
                <span>{lastFetched ? "UPDATED" : "LIVE SOURCES"}</span>
              </div>
              <JobResultsList
                jobs={jobs}
                loading={loadingJobs}
                onTrack={(job) => void addApplication(job)}
                onResetFilters={resetFilters}
              />
            </section>
          ) : tab === "pipeline" ? (
            <section className="jb-pipeline-page">
              <div className="jb-pipeline-hero">
                <div>
                  <span className="jb-eyebrow">PIPELINE / 03</span>
                  <h1>Your job search, in motion.</h1>
                </div>
                <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                  Find new roles
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
                <div className="jb-quick-add-fields">
                  <input value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} placeholder="Company" />
                  <input value={manualRole} onChange={(e) => setManualRole(e.target.value)} placeholder="Role" />
                  <button type="button" className="jb-button jb-button-solid" onClick={() => void createManualApplication()} disabled={manualLoading}>
                    {manualLoading ? "Adding…" : "Add"}
                  </button>
                </div>
              </section>
            </section>
          ) : (
            <section className="jb-overview">
              <div className="jb-hero">
                <div className="jb-hero-copy">
                  <div className="jb-eyebrow">JOB SEARCH / 01</div>
                  <h1>
                    Find work.
                    <span>Not another spreadsheet.</span>
                  </h1>
                  <div className="jb-hero-actions">
                    <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                      Explore live roles
                    </button>
                    <button type="button" className="jb-button jb-button-ghost" onClick={() => changeTab("pipeline")}>
                      Open pipeline
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
