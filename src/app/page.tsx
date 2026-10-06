"use client";

import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Filter,
  Gauge,
  Globe2,
  Layers3,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
  source: "remoteok" | "remotive" | "arbeitnow" | "hh";
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
  { key: "FOUND", label: "Found", tone: "text-zinc-300" },
  { key: "APPLIED", label: "Applied", tone: "text-blue-300" },
  { key: "SCREENING", label: "Screening", tone: "text-violet-300" },
  { key: "TECH", label: "Technical", tone: "text-amber-300" },
  { key: "OFFER", label: "Offer", tone: "text-emerald-300" },
  { key: "REJECTED", label: "Rejected", tone: "text-rose-300" },
];

const sourceLabel: Record<string, string> = {
  remoteok: "Remote OK",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  hh: "HeadHunter",
  REMOTEOK: "Remote OK",
  REMOTIVE: "Remotive",
  COMPANY_SITE: "Company",
  LINKEDIN: "LinkedIn",
  OTHER: "Other",
}; 

const navItems: Array<{
  key: "overview" | "search" | "pipeline";
  label: string;
  icon: LucideIcon;
}> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "search", label: "Live search", icon: Search },
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

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="glass-card p-5">
      <div className="mb-7 flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</span>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-400">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"overview" | "search" | "pipeline">("overview");
  const [apps, setApps] = useState<App[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobQuery, setJobQuery] = useState("frontend developer");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [sourceState, setSourceState] = useState<Record<string, "ok" | "error">>({});
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const searchJobs = useCallback(
    async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingJobs(true);
      setError("");

      try {
        const params = new URLSearchParams({
          query: jobQuery,
          location,
          source,
          remote: String(remoteOnly),
          limit: "72",
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
      } catch (value) {
        if (value instanceof DOMException && value.name === "AbortError") return;
        setError("Live search is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoadingJobs(false);
      }
    },
    [jobQuery, location, remoteOnly, source],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void searchJobs(), 450);
    return () => window.clearTimeout(timer);
  }, [jobQuery, location, source, remoteOnly, searchJobs]);

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
      job.source === "remoteok"
        ? "REMOTEOK"
        : job.source === "remotive"
          ? "REMOTIVE"
          : job.source === "hh"
            ? "HH"
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
      setTab("pipeline");
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

  async function loadDemo() {
    setDemoLoading(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      if (!response.ok) throw new Error("demo");
      const applicationsResponse = await fetch("/api/applications", {
        cache: "no-store",
      });
      if (!applicationsResponse.ok) throw new Error("applications");
      const applicationsData = await applicationsResponse.json();
      setApps(applicationsData.applications ?? []);
      setTab("overview");
    } catch {
      setError("Could not load demo data. Check your database connection.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-12%] top-[-18%] h-[38rem] w-[38rem] rounded-full bg-violet-600/[0.1] blur-[130px]" />
        <div className="absolute right-[-15%] top-[20%] h-[32rem] w-[32rem] rounded-full bg-sky-500/[0.08] blur-[140px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#060609]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055]">
              <Target size={19} className="text-violet-300" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">JoBrain</div>
              <div className="text-[11px] text-zinc-500">Job search intelligence</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="live-dot" />
            <span className="text-xs text-zinc-500">Live workspace</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-8 sm:px-6">
        <section className="mb-7">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">Personal command center</p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Stop losing applications.
                <span className="text-zinc-500"> Start seeing the funnel.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
                Search fresh roles across multiple sources, track the right ones, and see exactly where the pipeline slows down.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="button-secondary" onClick={() => void searchJobs()}>
                <RefreshCw size={15} className={loadingJobs ? "animate-spin" : ""} />
                Refresh
              </button>
              <button className="button-primary" onClick={() => void loadDemo()} disabled={demoLoading}>
                {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {demoLoading ? "Loading..." : "Load demo"}
              </button>
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={"nav-pill " + (tab === item.key ? "nav-pill-active" : "")}
              onClick={() => setTab(item.key)}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {tab === "overview" ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Tracked" value={stats.total} hint="total applications" icon={BriefcaseBusiness} />
              <StatCard label="Active" value={stats.active} hint="still moving" icon={Activity} />
              <StatCard label="Interviews" value={stats.interviews} hint="screening + technical" icon={Gauge} />
              <StatCard label="Offers" value={stats.offers} hint={stats.offerRate + "% of applied"} icon={CheckCircle2} />
              <StatCard label="Rejection" value={stats.rejectionRate + "%"} hint="of applied outcomes" icon={TrendingDown} />
            </section>

            <section className="mt-3 grid gap-3 xl:grid-cols-[1.45fr_.75fr]">
              <div className="glass-card overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Application funnel</div>
                      <div className="mt-1 text-xs text-zinc-500">Where opportunities are moving or leaking.</div>
                    </div>
                    <BarChart3 size={18} className="text-zinc-600" />
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  {funnel.map((item) => {
                    const width = stats.total ? Math.max((item.count / stats.total) * 100, item.count ? 9 : 0) : 0;
                    return (
                      <div key={item.key}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className={item.tone}>{item.label}</span>
                          <span className="text-zinc-500">{item.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.045]">
                          <div className="funnel-bar" style={{ width: width + "%", opacity: item.opacity }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">System signal</div>
                    <div className="mt-1 text-xs text-zinc-500">A compact read on the current funnel.</div>
                  </div>
                  <Zap size={17} className="text-amber-300" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-300">
                  {insight}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <div className="text-2xl font-semibold">{stats.applied}</div>
                    <div className="mt-1 text-xs text-zinc-500">applications</div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <div className="text-2xl font-semibold">{stats.interviews}</div>
                    <div className="mt-1 text-xs text-zinc-500">interview stages</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-3 grid gap-3 xl:grid-cols-[1fr_.9fr]">
              <div className="glass-card p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Recent applications</div>
                    <div className="mt-1 text-xs text-zinc-500">Your latest tracked moves.</div>
                  </div>
                  <button className="text-xs text-violet-300 hover:text-violet-200" onClick={() => setTab("pipeline")}>Open pipeline →</button>
                </div>
                <div className="space-y-2">
                  {apps.slice(0, 6).map((app) => (
                    <div key={app.id} className="row-card">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{app.role}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                          <span>{app.company}</span><span>·</span><span>{sourceLabel[app.source] ?? app.source}</span>
                        </div>
                      </div>
                      <span className={"status-chip status-" + app.status.toLowerCase()}>{app.status}</span>
                    </div>
                  ))}
                  {!apps.length ? (
                    <div className="empty-state">
                      <BriefcaseBusiness size={20} />
                      <span>No applications yet. Load demo data or track a live role.</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Live source matrix</div>
                    <div className="mt-1 text-xs text-zinc-500">Coverage during the latest search.</div>
                  </div>
                  <Globe2 size={17} className="text-zinc-600" />
                </div>
                <div className="grid gap-2">
                  {["remoteok", "remotive", "arbeitnow", "hh"].map((name) => (
                    <div key={name} className="source-row">
                      <div className="flex items-center gap-3">
                        <span className={"size-2 rounded-full " + (sourceState[name] === "error" ? "bg-rose-400" : sourceState[name] === "ok" ? "bg-emerald-400" : "bg-zinc-700")} />
                        <span className="text-sm">{sourceLabel[name]}</span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {sourceState[name] === "error" ? "unavailable" : sourceState[name] === "ok" ? "connected" : "idle"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-white/[0.06] pt-4 text-xs text-zinc-600">
                  {lastFetched ? "Last fetch " + relativeTime(lastFetched) : "Waiting for first fetch"}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "search" ? (
          <section>
            <div className="glass-card p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[1.25fr_.8fr_.55fr_auto]">
                <label className="field-wrap">
                  <Search size={16} />
                  <input value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="frontend developer" />
                </label>
                <label className="field-wrap">
                  <Globe2 size={16} />
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Los Angeles, US" />
                </label>
                <label className="field-wrap">
                  <Filter size={16} />
                  <select value={source} onChange={(event) => setSource(event.target.value)}>
                    <option value="all">All sources</option>
                    <option value="remoteok">Remote OK</option>
                    <option value="remotive">Remotive</option>
                    <option value="arbeitnow">Arbeitnow</option>
                    <option value="hh">HeadHunter</option>
                  </select>
                </label>
                <button className={"button-secondary justify-center " + (remoteOnly ? "border-violet-400/30 bg-violet-400/[0.07] text-violet-200" : "")} onClick={() => setRemoteOnly((value) => !value)}>
                  <Target size={15} /> Remote
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <span>{loadingJobs ? "Querying sources…" : jobs.length + " roles matched"}</span>
                <span className="flex items-center gap-2"><span className="live-dot" />Results update while you type</span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <article key={job.id} className="job-card">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="source-chip">{sourceLabel[job.source]}</span>
                        {job.remote ? <span className="source-chip source-chip-accent">Remote</span> : null}
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold leading-6">{job.title}</h3>
                      <div className="mt-1 text-sm text-zinc-500">{job.company}</div>
                    </div>
                    <a className="icon-button" href={job.url} target="_blank" rel="noreferrer" aria-label="Open job">
                      <ExternalLink size={15} />
                    </a>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Globe2 size={12} />{job.location || "Remote"}</span>
                    <span>·</span><span>{relativeTime(job.postedAt)}</span>
                  </div>
                  {job.salary ? <div className="mb-4 text-xs text-emerald-300">{job.salary}</div> : null}
                  <p className="line-clamp-3 min-h-[4.2rem] text-xs leading-5 text-zinc-500">{job.description || "No description returned by source."}</p>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                    <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                      {job.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                    </div>
                    <button className="button-small" onClick={() => void addApplication(job)}><Plus size={14} />Track</button>
                  </div>
                </article>
              ))}
              {!jobs.length && !loadingJobs ? (
                <div className="empty-state md:col-span-2 xl:col-span-3">
                  <Search size={22} />No roles matched. Try a broader query or remove the location filter.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "pipeline" ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Application pipeline</div>
                <div className="mt-1 text-xs text-zinc-500">Move every role forward or close the loop.</div>
              </div>
              <button className="button-secondary" onClick={() => setTab("search")}><Search size={15} />Find roles</button>
            </div>

            <div className="glass-card mb-3 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold">Quick add</div>
                <div className="mt-1 text-xs text-zinc-500">Track an application from any other source without opening Live search.</div>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_1.2fr_auto]">
                <input
                  className="quick-input"
                  value={manualCompany}
                  onChange={(event) => setManualCompany(event.target.value)}
                  placeholder="Company"
                />
                <input
                  className="quick-input"
                  value={manualRole}
                  onChange={(event) => setManualRole(event.target.value)}
                  placeholder="Role"
                />
                <button
                  className="button-primary justify-center"
                  onClick={() => void createManualApplication()}
                  disabled={manualLoading || !manualCompany.trim() || !manualRole.trim()}
                >
                  {manualLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {stages.map((stage) => {
                const items = apps.filter((app) => app.status === stage.key);
                return (
                  <div key={stage.key} className="pipeline-column">
                    <div className="mb-3 flex items-center justify-between">
                      <span className={"text-xs font-semibold uppercase tracking-[0.14em] " + stage.tone}>{stage.label}</span>
                      <span className="count-badge">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((app) => (
                        <div key={app.id} className="pipeline-card relative">
                          <button
                            className="delete-button"
                            onClick={() => void deleteApplication(app.id)}
                            aria-label={"Delete " + app.company + " application"}
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="pr-7 text-xs font-medium leading-5">{app.role}</div>
                          <div className="mt-1 truncate text-[11px] text-zinc-500">{app.company}</div>
                          <div className="mt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-600">{app.source}</div>
                          <select className="status-select" value={app.status} onChange={(event) => void updateStatus(app.id, event.target.value as Status)}>
                            {stages.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                          </select>
                        </div>
                      ))}
                      {!items.length ? <div className="empty-column">Empty</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
