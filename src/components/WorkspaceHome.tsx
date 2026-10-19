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
  ArrowRight,
  Compass,
  BriefcaseBusiness,
  CheckCircle2,
  History,
  FolderKanban,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { createPortal, flushSync } from "react-dom";
import JobResultsList, { type JobResult } from "@/components/JobResultsList";
import LatticeLoader from "@/components/LatticeLoader";
import ApplicationDashboard from "@/components/ApplicationDashboard";
import FirstRunTour from "@/components/FirstRunTour";
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
  createdAt?: string;
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
  const { isLoaded, isSignedIn } = useAuth();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountReason, setAccountReason] = useState<string | null>(null);
  const [tourReplayKey, setTourReplayKey] = useState(0);

  // Seed only the tiny account avatar from cache. Wallpapers are applied by
  // PreferencesBootstrap through CSS, so the workspace does not need a
  // second background renderer or a WebGL animation loop.
  useLayoutEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const cached = localStorage.getItem("jobrain-profile");
        if (!cached) return;
        const profile = JSON.parse(cached) as { avatarUrl?: unknown };
        if (typeof profile.avatarUrl === "string" && /^https?:\/\//i.test(profile.avatarUrl)) {
          setProfileAvatarUrl(profile.avatarUrl);
        }
      } catch {
        // The server request below remains the source of truth.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfileAvatarUrl(null);
      return;
    }
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { profile?: { avatarUrl?: unknown } };
      })
      .then((data) => {
        if (!active) return;
        const avatarUrl = data?.profile?.avatarUrl;
        setProfileAvatarUrl(
          typeof avatarUrl === "string" && /^https?:\/\//i.test(avatarUrl) ? avatarUrl : null,
        );
      })
      .catch(() => {
        // Keep the cached avatar and let the workspace load.
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  const reduceMotion = useReducedMotionPreferred();
  const [tab, setTab] = useState<"overview" | "search" | "pipeline">("overview");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("jobrain-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
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
  const abortRef = useRef<AbortController | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const requestAccount = useCallback((feature: string) => {
    setAccountReason(feature);
    setAccountMenuOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("jobrain-theme", theme);

      const cachedAppearance = window.localStorage.getItem("jobrain-appearance");
      if (cachedAppearance) {
        const appearance = JSON.parse(cachedAppearance) as Record<string, unknown>;
        window.localStorage.setItem(
          "jobrain-appearance",
          JSON.stringify({ ...appearance, theme }),
        );
      }

      const cachedSettings = window.localStorage.getItem("jobrain-settings");
      if (cachedSettings) {
        const settings = JSON.parse(cachedSettings) as Record<string, unknown>;
        window.localStorage.setItem(
          "jobrain-settings",
          JSON.stringify({ ...settings, theme }),
        );
      }
    } catch {
      // Theme switching stays available in memory if storage is disabled.
    }
  }, [theme]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setApps([]);
      setLoadingApps(false);
      return;
    }

    let cancelled = false;
    setLoadingApps(true);
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
      })
      .finally(() => {
        if (!cancelled) setLoadingApps(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    // Guests can switch themes locally; only signed-in users have a server preference.
    if (!isSignedIn) return;

    // Persist the quick-switch to the account preference as well as local cache
    // so PreferencesBootstrap does not restore an older server-side theme.
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { settings?: Record<string, unknown> };
        if (data.settings) {
          try {
            window.localStorage.setItem("jobrain-settings", JSON.stringify(data.settings));
          } catch {
            // The server preference remains saved if browser storage is unavailable.
          }
        }
      })
      .catch(() => {
        // Local theme selection remains usable if the preference API is unavailable.
      });
  }, [isSignedIn, theme]);

  const changeTab = useCallback((next: "overview" | "search" | "pipeline") => {
    if (next === tab) return;

    const update = () => setTab(next);
    if (reduceMotion || typeof document === "undefined") {
      update();
      return;
    }

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (typeof transitionDocument.startViewTransition === "function") {
      try {
        const transition = transitionDocument.startViewTransition(() => flushSync(update)) as {
          finished?: Promise<unknown>;
        };
        // Starting a second tab transition can skip the first one. Treat that as
        // normal interaction rather than an unhandled AbortError in the console.
        void transition.finished?.catch(() => undefined);
      } catch {
        update();
      }
    } else {
      update();
    }
  }, [reduceMotion, tab]);

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

  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

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
      if (isSignedIn) {
        void fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SEARCH",
            title: jobQuery.trim(),
            metadata: { location, platform, experience, remoteOnly },
          }),
        }).catch(() => undefined);
      }
    } catch (value) {
      if (value instanceof DOMException && value.name === "AbortError") return;
      setError("Live search is temporarily unavailable.");
    } finally {
      if (!controller.signal.aborted) setLoadingJobs(false);
    }
  }, [experience, isSignedIn, jobQuery, location, platform, remoteOnly]);

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
    if (!isSignedIn) {
      requestAccount("saving jobs to your pipeline");
      return;
    }

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
    if (!isSignedIn) {
      requestAccount("adding and managing applications");
      return;
    }
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
    if (!isSignedIn) {
      requestAccount("personalized job recommendations");
      return;
    }
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

  const sourceEntries = Object.entries(sourceState);

  return (
    <main className="jb-shell">
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
                data-tour={item.key === "search" ? "search-tab" : item.key === "pipeline" ? "pipeline-tab" : undefined}
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
              data-tour="theme-toggle"
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
            <div className="jb-account-menu-wrap" ref={accountMenuRef} data-tour="account-shortcuts">
              <button
                type="button"
                className="jb-account-menu-trigger"
                data-tour="account-menu-trigger"
                aria-label="Account options"
                aria-haspopup="dialog"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                {isSignedIn && profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatarUrl} alt="" loading="eager" fetchPriority="high" decoding="async" />
                ) : (
                  <UserRound size={16} />
                )}
                <span className="jb-account-trigger-label">{isLoaded && isSignedIn ? "Account" : "Guest"}</span>
              </button>

              {accountMenuOpen ? (
                <div className="jb-account-menu" role="dialog" aria-label="Account and guest access">
                  <div className="jb-account-menu-intro">
                    <span className="jb-account-menu-eyebrow">{isLoaded && isSignedIn ? "YOUR ACCOUNT" : "GUEST MODE"}</span>
                    <strong>{isLoaded && isSignedIn ? "Your career workspace" : "Explore without signing up"}</strong>
                    <p>
                      {isLoaded && isSignedIn
                        ? "Your saved jobs, applications, history and profile are ready."
                        : "Search live jobs and open listings for free. An account is only needed when you want to save roles, manage a pipeline, or personalize your experience."}
                    </p>
                  </div>

                  {isLoaded && isSignedIn ? (
                    <>
                      <div className="jb-account-menu-links">
                        <Link href="/profile" onClick={() => setAccountMenuOpen(false)}><UserRound size={15} /> Profile <ArrowRight size={13} /></Link>
                        <Link href="/settings" onClick={() => setAccountMenuOpen(false)}><Settings size={15} /> Settings <ArrowRight size={13} /></Link>
                        <Link href="/projects" onClick={() => setAccountMenuOpen(false)}><FolderKanban size={15} /> Projects <ArrowRight size={13} /></Link>
                        <Link href="/history" onClick={() => setAccountMenuOpen(false)}><History size={15} /> History <ArrowRight size={13} /></Link>
                        <Link href="/notifications" onClick={() => setAccountMenuOpen(false)}><Bell size={15} /> Notifications <ArrowRight size={13} /></Link>
                      </div>
                      <div className="jb-account-menu-footer">
                        <span>Signed in</span>
                        <UserButton appearance={{ elements: { avatarBox: "jb-auth-avatar" } }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="jb-account-menu-browse"
                        onClick={() => { setAccountMenuOpen(false); changeTab("search"); }}
                      >
                        <Search size={15} /> Browse live jobs <ArrowRight size={14} />
                      </button>
                      <div className="jb-account-menu-actions">
                        <Link href="/sign-up?redirect_url=%2F" className="jb-account-menu-create" onClick={() => setAccountMenuOpen(false)}>
                          Create free account
                        </Link>
                        <Link href="/sign-in?redirect_url=%2F" className="jb-account-menu-signin" onClick={() => setAccountMenuOpen(false)}>
                          Sign in
                        </Link>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    className="jb-account-menu-tour"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setTourReplayKey((current) => current + 1);
                    }}
                  >
                    <Sparkles size={14} /> {isLoaded && isSignedIn ? "Replay quick tour" : "How JoBrain works"}
                  </button>
                </div>
              ) : null}
            </div>
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
              isLoaded && isSignedIn ? (
                <ApplicationDashboard apps={apps} loading={loadingApps} onNavigate={changeTab} />
              ) : (
                <section key="overview" className="jb-overview jb-view-panel jb-guest-overview">
                  <div className="jb-hero">
                    <div className="jb-hero-copy">
                      <div className="jb-eyebrow">
                        <span className="jb-eyebrow-line" />
                        YOUR JOB SEARCH / 01
                      </div>
                      <h1 className="jb-guest-headline">Find work.<br /><span>Not another spreadsheet.</span></h1>
                      <p className="jb-hero-support">
                        Search real openings from multiple job sources, compare roles, and explore at your own pace. JoBrain is free to browse — create an account only when you want to save jobs or track applications.
                      </p>
                      <div className="jb-hero-actions" data-tour="hero-actions">
                        <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                          <Search size={16} /> Explore live roles
                        </button>
                        <button type="button" className="jb-button jb-button-ghost" onClick={() => setTourReplayKey((current) => current + 1)}>
                          <Sparkles size={15} /> How it works
                        </button>
                      </div>
                      <div className="jb-guest-trust-row">
                        <span><i /> Browse without an account</span>
                        <span><i /> Multiple job sources</span>
                        <span><i /> Private application tracking</span>
                      </div>
                    </div>
                    <div className="jb-guest-preview" aria-label="JoBrain workspace preview">
                      <div className="jb-guest-preview-top">
                        <span className="jb-guest-preview-brand"><span>J</span> JoBrain</span>
                        <span className="jb-guest-preview-live"><i /> LIVE SEARCH</span>
                      </div>
                      <div className="jb-guest-preview-title">
                        <span className="jb-dashboard-overline">THE NEXT OPPORTUNITY</span>
                        <strong>Good work<br />starts with a<br /><em>better search.</em></strong>
                        <p>One search. A clearer view of what’s out there.</p>
                      </div>
                      <div className="jb-guest-preview-stats">
                        <div><strong>01</strong><span>Search roles</span></div>
                        <div><strong>02</strong><span>Compare fits</span></div>
                        <div><strong>03</strong><span>Track progress</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="jb-guest-feature-grid">
                    <button type="button" className="jb-guest-feature-card" onClick={() => changeTab("search")}>
                      <span className="jb-guest-feature-icon"><Compass size={18} /></span>
                      <span className="jb-guest-feature-copy"><strong>Explore live roles</strong><small>Search by job title, skill, company, location or remote preference.</small></span>
                      <ArrowRight size={15} />
                    </button>
                    <button type="button" className="jb-guest-feature-card" onClick={() => requestAccount("saving roles and managing applications")}>
                      <span className="jb-guest-feature-icon"><BriefcaseBusiness size={18} /></span>
                      <span className="jb-guest-feature-copy"><strong>Build your pipeline</strong><small>Save jobs, track every stage and schedule your next action with a free account.</small></span>
                      <ArrowRight size={15} />
                    </button>
                    <button type="button" className="jb-guest-feature-card" onClick={() => setTourReplayKey((current) => current + 1)}>
                      <span className="jb-guest-feature-icon"><Sparkles size={18} /></span>
                      <span className="jb-guest-feature-copy"><strong>Take a quick tour</strong><small>See how JoBrain search, application tracking and preferences fit together.</small></span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              )
            ) : null}

            {tab === "search" ? (
              <section key="search" className="jb-search-page jb-view-panel">
                <div className="jb-command" data-tour="search-panel">
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
                        ["remoteok", "remotive", "jobicy", "adzuna", "linkedin", "indeed"].map((name) => (
                          <span key={name} className="jb-source-pill is-pending" title="Checked when you run a search">
                            <i aria-hidden="true" />
                            {SOURCE_LABELS[name] ?? name}
                          </span>
                        ))
                      )}
                    </div>
                  </section>
                </div>
                {!jobQuery.trim() && !loadingJobs && !recommendationsMode ? (
                  <div className="jb-search-empty" data-tour="search-empty">
                    <div className="jb-search-empty-header">
                      <span className="jb-search-empty-icon"><Search size={19} /></span>
                      <div>
                        <span className="jb-dashboard-overline">START WITH AN IDEA</span>
                        <strong>What kind of work are you looking for?</strong>
                        <p>Search by role, company or skill. Filter by location, experience and remote options. You can explore listings without an account.</p>
                      </div>
                    </div>
                    <div className="jb-search-empty-suggestions">
                      <span className="jb-search-suggestion-label">QUICK SEARCHES</span>
                      <div className="jb-suggest-chips">
                        {SUGGESTIONS.map((item) => (
                          <button key={item} type="button" className="jb-suggest-chip" onClick={() => applySuggestion(item)}>
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="jb-search-empty-foot">
                      <span><i /> Free to browse</span>
                      <span><i /> Filters update live</span>
                      <span><i /> Save roles with an account</span>
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
                {isLoaded && isSignedIn ? (
                  <>
                    <div className="jb-pipeline-hero">
                      <div>
                        <span className="jb-eyebrow">PIPELINE / 03</span>
                        <h1>Your job search, in motion.</h1>
                      </div>
                      <button type="button" className="jb-button jb-button-solid" onClick={() => changeTab("search")}>
                        Find new roles
                      </button>
                    </div>
                    <div className="jb-pipeline-signal" data-tour="pipeline-stage">
                      {funnel.map((item, index) => (
                        <div key={item.key} className={"jb-pipeline-signal-item " + item.tone}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <strong>{item.count}</strong>
                          <small>{item.label}</small>
                        </div>
                      ))}
                    </div>
                    <section className="jb-quick-add">
                      <div className="jb-quick-add-heading">
                        <div><strong>Add an application</strong><span>Keep every role and follow-up in one place.</span></div>
                      </div>
                      <div className="jb-quick-add-fields">
                        <input value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} placeholder="Company" aria-label="Company" />
                        <input value={manualRole} onChange={(e) => setManualRole(e.target.value)} placeholder="Role title" aria-label="Role title" />
                        <button type="button" className="jb-button jb-button-solid" onClick={() => void createManualApplication()} disabled={manualLoading}>
                          {manualLoading ? <LatticeLoader label="Adding" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Add application"}
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
                              {app.nextActionAt ? <div className="jb-job-company">Next action · {new Date(app.nextActionAt).toLocaleDateString()}</div> : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="jb-search-empty">
                        <strong>Your pipeline starts with one role.</strong>
                        <p>Track a role from search or add one above. Then update its stage and schedule the next action.</p>
                        <div className="jb-suggest-chips">
                          <button type="button" className="jb-suggest-chip" onClick={() => changeTab("search")}>Find roles</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <section className="jb-guest-pipeline-gate" data-tour="pipeline-stage">
                    <div className="jb-guest-pipeline-icon"><BriefcaseBusiness size={22} /></div>
                    <span className="jb-dashboard-overline">YOUR APPLICATIONS, ORGANIZED</span>
                    <h1>Every opportunity deserves a next step.</h1>
                    <p>Browse and compare jobs freely. A free account unlocks your private application pipeline, stage tracking, personal calendar, and reminders.</p>
                    <div className="jb-guest-pipeline-points">
                      <span><CheckCircle2 size={15} /> Keep every application in one place</span>
                      <span><CalendarDays size={15} /> Plan interviews and follow-ups</span>
                      <span><TrendingUp size={15} /> See progress and trends over time</span>
                    </div>
                    <div className="jb-hero-actions">
                      <button type="button" className="jb-button jb-button-solid" onClick={() => requestAccount("building your application pipeline")}>Create free account <ArrowRight size={15} /></button>
                      <button type="button" className="jb-button jb-button-ghost" onClick={() => changeTab("search")}>Keep browsing</button>
                    </div>
                  </section>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
      <FirstRunTour activeTab={tab} onNavigate={changeTab} />
    </main>
  );
}
