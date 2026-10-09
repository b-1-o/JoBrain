"use client";

import {
  Layers3,
  LayoutDashboard,
  Search,
  Settings,
  UserRound,
  Moon,
  Sun,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import PatternWaves from "@components/PatternWaves";
import JobResultsList, { type JobResult } from "@/components/JobResultsList";
import LatticeLoader from "@/components/LatticeLoader";
import OverviewAnalytics from "@/components/OverviewAnalytics";
import DecryptedText from "@/components/DecryptedText";
import TechText from "@/components/TechText";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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

const navItems: Array<{ key: "overview" | "search" | "pipeline"; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "search", label: "Search", icon: Search },
  { key: "pipeline", label: "Pipeline", icon: Layers3 },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "remoteok", label: "Remote OK" },
  { value: "remotive", label: "Remotive" },
  { value: "jobicy", label: "Jobicy" },
  { value: "adzuna", label: "Adzuna" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
];

const EXPERIENCE_OPTIONS = [
  { value: "all", label: "Any level" },
  { value: "intern", label: "Intern / Entry" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Staff" },
];

const SUGGESTIONS = ["Frontend Engineer", "React Developer", "Product Designer", "Software Engineer", "Remote Intern"];

const SOURCE_LABELS: Record<string, string> = {
  remoteok: "Remote OK",
  remotive: "Remotive",
  jobicy: "Jobicy",
  adzuna: "Adzuna",
  googlejobs: "Google Jobs",
  linkedin: "LinkedIn",
  indeed: "Indeed",
};

function useReducedMotionPreferred() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setReduced(mq.matches || document.documentElement.dataset.reducedMotion === "true");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function WorkspaceHome() {
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { profile?: { avatarUrl?: unknown } };
      })
      .then((data) => {
        const url = data?.profile?.avatarUrl;
        if (active && typeof url === "string" && /^https?:\/\//i.test(url)) {
          setProfileAvatarUrl(url);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const reduceMotion = useReducedMotionPreferred();
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
  const [recommendationsMode, setRecommendationsMode] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [sourceState, setSourceState] = useState<Record<string, "ok" | "error">>({});
  const [error, setError] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [hasCustomBackground, setHasCustomBackground] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("jobrain-theme", theme);
  }, [theme]);

  useEffect(() => {
    const read = () =>
      setHasCustomBackground(document.documentElement.getAttribute("data-custom-background") === "true");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-custom-background"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/applications", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("applications");
        return (await r.json()) as { applications?: App[] };
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
    setTheme((c) => (c === "dark" ? "light" : "dark"));
  }, []);

  const changeTab = useCallback((next: "overview" | "search" | "pipeline") => {
    setTab(next);
  }, []);

  const updateNavIndicator = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(".jb-nav-item.is-active");
    if (!active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    updateNavIndicator();
    window.addEventListener("resize", updateNavIndicator);
    return () => window.removeEventListener("resize", updateNavIndicator);
  }, [tab, updateNavIndicator]);

  const searchJobs = useCallback(async () => {
    setRecommendationsMode(false);
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
      setSourceState(data.sources ?? {});
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
    if (recommendationsMode || !jobQuery.trim()) return;
    const timer = window.setTimeout(() => void searchJobs(), 450);
    return () => window.clearTimeout(timer);
  }, [jobQuery, location, platform, experience, remoteOnly, searchJobs, recommendationsMode]);

  const funnel = useMemo(
    () =>
      stages.map((stage, index) => ({
        ...stage,
        count: apps.filter((item) => item.status === stage.key).length,
        opacity: 1 - index * 0.07,
      })),
    [apps],
  );

  async function addApplication(job: JobResult) {
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

  function clearSearchResults() {
    abortRef.current?.abort();
    setJobs([]);
    setSourceState({});
    setLastFetched(null);
    setLoadingJobs(false);
  }

  async function loadRecommendations() {
    abortRef.current?.abort();
    setRecommendationsMode(true);
    setJobQuery("");
    setLoadingJobs(true);
    setError("");
    setJobs([]);
    setLastFetched(null);
    setSourceState({});
    try {
      const response = await fetch("/api/recommendations", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        enabled?: boolean;
        jobs?: Job[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not build recommendations.");
      if (!data.enabled) throw new Error("Search suggestions are disabled in Settings.");
      const recommendedJobs = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(recommendedJobs);
      setSourceState(Object.fromEntries(
        [...new Set(recommendedJobs.map((job) => job.platform))].map((source) => [source, "ok"]),
      ) as Record<string, "ok" | "error">);
      setLastFetched("recommendations-" + new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load personalized roles.");
    } finally {
      setLoadingJobs(false);
    }
  }


  function handleJobQueryChange(value: string) {
    setRecommendationsMode(false);
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

  function applySuggestion(value: string) {
    setRecommendationsMode(false);
    setJobQuery(value);
    changeTab("search");
  }

  const showWaves = !hasCustomBackground;
  const isDark = theme === "dark";
  const sourceEntries = Object.entries(sourceState);

  return (
    <main className="jb-shell">
      {showWaves ? (
        isDark ? (
          <PatternWaves
            preset="silk"
            color="#ffffff"
            backgroundColor="#000000"
            fade="edges"
            interactive
            cursorSize={50}
            cursorStrength={0.6}
            shine={0.15}
            speed={0.1}
            opacity={1}
            paused={reduceMotion}
            className="jb-pattern-waves"
          />
        ) : (
          <PatternWaves
            preset="silk"
            color="#000000"
            backgroundColor="#d0d0d0"
            fade="edges"
            interactive
            cursorSize={50}
            cursorStrength={0.6}
            shine={0.15}
            speed={0.1}
            opacity={1}
            paused={reduceMotion}
            className="jb-pattern-waves"
          />
        )
      ) : null}

      <header className="jb-topbar">
        <div className="jb-topbar-inner">
          <button type="button" className="jb-brand" onClick={() => changeTab("overview")} aria-label="JoBrain home">
            <span className="jb-brand-mark">JB</span>
            <span className="jb-brand-word">JOBRAIN</span>
            <span className="jb-brand-index">/ 01</span>
          </button>
          <nav className="jb-nav" aria-label="Primary" ref={navRef}>
            {!reduceMotion ? (
              <span
                className="jb-nav-indicator"
                style={{ left: indicator.left, width: indicator.width } as CSSProperties}
                aria-hidden
              />
            ) : null}
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
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
            <div className="jb-topbar-status">
              <span className="jb-status-dot" />
              <span>{loadingJobs ? <LatticeLoader label="Syncing" status="working" cellSize={3} gap={1} fontSize={9} showTimer={false} /> : "LIVE"}</span>
            </div>
            <div className="jb-account-shortcuts" aria-label="Account">
              <Link href="/profile" className="jb-account-shortcut" title="Profile" aria-label="Profile">
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatarUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <UserRound size={14} />
                )}
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
              \u00d7
            </button>
          </div>
        ) : null}

        <div className="jb-view-stage">
          <div className="jb-view-transition-host">
            {tab === "overview" ? (
              <section key="overview" className="jb-overview jb-view-panel">
                <div className="jb-hero">
                  <div className="jb-hero-copy">
                    <div className="jb-eyebrow">
                      <span className="jb-eyebrow-line" />
                      JOB SEARCH / 01
                    </div>
                    <h1 className="sr-only">Find work. Not another spreadsheet.</h1>
                    <div className="jb-tech-text-wrap">
                      {reduceMotion ? (
                        <span className="jb-tech-text-static">Find work.</span>
                      ) : (
                        <TechText
                          text="Find work."
                          fontWeight={600}
                          fontSize={150}
                          color={isDark ? "#ffffff" : "#000000"}
                          accentColor={isDark ? "#ffffff" : "#000000"}
                          reveal="letter"
                          dashLength={4}
                          dashGap={2}
                          specks={9}
                          selection
                          labels
                          draggable
                          sweep
                          speed={0.65}
                        />
                      )}
                    </div>
                    <div className="jb-decrypt">
                      {reduceMotion ? (
                        "Not another spreadsheet."
                      ) : (
                        <DecryptedText
                          text="Not another spreadsheet."
                          animateOn="view"
                          sequential
                          speed={35}
                          revealDirection="center"
                          useOriginalCharsOnly
                          className="jb-decrypt-character"
                          encryptedClassName="jb-decrypt-character is-encrypted"
                        />
                      )}
                    </div>
                    <p className="jb-hero-support">
                      JoBrain is a job-search operating system — live roles, pipeline tracking, and a portfolio that stays ready for recruiters.
                    </p>
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
                <Show when="signed-in">
                  <OverviewAnalytics />
                </Show>
              </section>
            ) : null}

            {tab === "search" ? (
              <section key="search" className="jb-search-page jb-view-panel">
                <div className="jb-command">
                  <div className="jb-command-top">
                    <div className="jb-command-search">
                      <Search size={16} />
                      <input
                        value={jobQuery}
                        onChange={(e) => handleJobQueryChange(e.target.value)}
                        placeholder="Search jobs, skills, companies…"
                        aria-label="Search jobs"
                      />
                      {jobQuery ? (
                        <button type="button" className="jb-icon-button" aria-label="Clear search" onClick={() => handleJobQueryChange("")}>
                          <X size={14} />
                        </button>
                      ) : null}
                      <span className="jb-search-hint">{loadingJobs ? "SYNC" : "LIVE"}</span>
                    </div>
                  </div>
                  <div className="jb-command-filters">
                    <label>
                      <span>Location</span>
                      <input value={location} onChange={(e) => { setRecommendationsMode(false); setLocation(e.target.value); }} placeholder="City, region, or remote" aria-label="Location filter" />
                    </label>
                    <label>
                      <span>Platform</span>
                      <select value={platform} onChange={(e) => { setRecommendationsMode(false); setPlatform(e.target.value); }} aria-label="Platform filter">
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={"jb-command-toggle" + (remoteOnly ? " is-on" : "")}
                      onClick={() => { setRecommendationsMode(false); setRemoteOnly((v) => !v); }}
                      aria-pressed={remoteOnly}
                    >
                      <span>Remote only</span>
                      <i />
                    </button>
                    <button type="button" className="jb-command-reset" onClick={resetFilters}>
                      Reset
                    </button>
                    <section className="jb-experience-control" aria-labelledby="jb-experience-label">
                      <div className="jb-experience-heading">
                        <span id="jb-experience-label">Experience level</span>
                      </div>
                      <div className="jb-experience-steps" role="group" aria-label="Choose experience level">
                        {EXPERIENCE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={"jb-experience-step" + (experience === option.value ? " is-active" : "")}
                            aria-pressed={experience === option.value}
                            onClick={() => { setRecommendationsMode(false); setExperience(option.value); }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
                <div className="jb-results-head">
                  <section className="jb-results-status" aria-labelledby="jb-search-status-label">
                    <span className="jb-results-label" id="jb-search-status-label">SEARCH STATUS</span>
                    <span className="jb-results-status-value" role="status" aria-live="polite">
                      {loadingJobs
                        ? <LatticeLoader label={recommendationsMode ? "Finding roles for you" : "Searching live sources"} status="working" cellSize={4} gap={1} fontSize={11} showTimer={false} />
                        : recommendationsMode
                          ? `${jobs.length} personalized roles`
                          : jobs.length
                            ? `${jobs.length} matching roles`
                            : jobQuery.trim()
                              ? "No matches yet"
                              : "Ready when you are"}
                    </span>
                    <button
                      type="button"
                      className={"jb-recommendations-trigger" + (recommendationsMode ? " is-active" : "")}
                      onClick={() => void loadRecommendations()}
                      disabled={loadingJobs}
                    >
                      <Sparkles size={14} />
                      For you
                    </button>
                  </section>
                  <section className="jb-source-cluster" aria-labelledby="jb-live-sources-label">
                    <span className="jb-results-label" id="jb-live-sources-label">LIVE SOURCES</span>
                    <div className="jb-source-pills" aria-label="Live sources">
                      {sourceEntries.length ? (
                        sourceEntries.map(([name, status]) => (
                          <span key={name} className={"jb-source-pill" + (status === "ok" ? " is-ok" : " is-err")} title={status === "ok" ? "Responding" : "Unavailable"}>
                            <i aria-hidden="true" />
                            {SOURCE_LABELS[name] ?? name}
                          </span>
                        ))
                      ) : (
                        <span className="jb-source-pill">
                          <i aria-hidden="true" />
                          Waiting for data
                        </span>
                      )}
                    </div>
                  </section>
                </div>
                {!jobQuery.trim() && !loadingJobs && !recommendationsMode ? (
                  <div className="jb-search-empty">
                    <strong>Explore live roles.</strong>
                    <p>Start with a skill, title, or company. JoBrain queries multiple sources in parallel and keeps your results readable.</p>
                    <div className="jb-suggest-chips">
                      {SUGGESTIONS.map((item) => (
                        <button key={item} type="button" className="jb-suggest-chip" onClick={() => applySuggestion(item)}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <JobResultsList
                    key={recommendationsMode ? (lastFetched ?? "recommendations") : (lastFetched ?? `empty-${jobQuery}-${location}-${platform}-${experience}-${remoteOnly}`)}
                    jobs={jobs}
                    loading={loadingJobs}
                    onTrack={(job) => void addApplication(job)}
                    onResetFilters={resetFilters}
                  />
                )}
              </section>
            ) : null}

            {tab === "pipeline" ? (
              <section key="pipeline" className="jb-pipeline-page jb-view-panel">
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
                      {manualLoading ? <LatticeLoader label="Adding" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Add"}
                    </button>
                  </div>
                </section>
                {apps.length ? (
                  <div className="jb-job-list" style={{ marginTop: 20 }}>
                    {apps.slice(0, 12).map((app, index) => (
                      <article key={app.id} className="jb-job-row">
                        <div className="jb-job-index">{String(index + 1).padStart(2, "0")}</div>
                        <div className="jb-job-main">
                          <div className="jb-job-overline">
                            <span>{app.status}</span>
                            <span>{app.source}</span>
                          </div>
                          <h2>{app.role}</h2>
                          <div className="jb-job-company">{app.company}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="jb-search-empty">
                    <strong>Pipeline is empty.</strong>
                    <p>Track roles from search or add one manually to start your funnel.</p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
