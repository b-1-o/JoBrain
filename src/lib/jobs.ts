export type JobSource = "remoteok" | "remotive" | "arbeitnow" | "hh";

export type Job = {
  id: string;
  source: JobSource;
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

export type JobSearchParams = {
  query: string;
  location: string;
  remoteOnly: boolean;
  source: JobSource | "all";
  limit: number;
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(input: unknown) {
  const date = input ? new Date(input as string | number) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function matches(job: Job, params: JobSearchParams) {
  const haystack = (
    job.title +
    " " +
    job.company +
    " " +
    job.location +
    " " +
    job.description +
    " " +
    job.tags.join(" ")
  ).toLowerCase();

  const query = params.query.trim().toLowerCase();
  const location = params.location.trim().toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (location && !job.location.toLowerCase().includes(location)) return false;
  if (params.remoteOnly && !job.remote) return false;

  return true;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(response.status + " " + response.statusText);
  }

  return response.json() as Promise<T>;
}

async function remoteOk(): Promise<Job[]> {
  const data = await fetchJson<unknown[]>("https://remoteok.com/api");

  return data
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && "slug" in item,
    )
    .map((item) => ({
      id: "remoteok:" + String(item.id ?? item.slug),
      source: "remoteok" as const,
      title: String(item.position ?? "Untitled role"),
      company: String(item.company ?? "Unknown company"),
      location: String(item.location ?? "Remote"),
      remote: true,
      url: String(
        item.url ??
          ("https://remoteok.com/remote-jobs/" + String(item.slug)),
      ),
      description: stripHtml(String(item.description ?? "")),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
      salary:
        item.salary_min || item.salary_max
          ? (item.salary_min ? "$" + item.salary_min : "") +
            (item.salary_min && item.salary_max ? "–" : "") +
            (item.salary_max ? "$" + item.salary_max : "")
          : undefined,
      postedAt: safeDate(item.date),
    }));
}

async function remotive(query: string): Promise<Job[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");

  if (query) url.searchParams.set("search", query);
  url.searchParams.set("limit", "50");

  const data = await fetchJson<{
    jobs?: Array<Record<string, unknown>>;
  }>(url.toString());

  return (data.jobs ?? []).map((item) => ({
    id: "remotive:" + String(item.id ?? item.url),
    source: "remotive" as const,
    title: String(item.title ?? "Untitled role"),
    company: String(item.company_name ?? "Unknown company"),
    location: String(item.candidate_required_location ?? "Remote"),
    remote: true,
    url: String(item.url ?? "https://remotive.com/"),
    description: stripHtml(String(item.description ?? item.job_type ?? "")),
    tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
    salary: item.salary ? String(item.salary) : undefined,
    postedAt: safeDate(item.publication_date),
  }));
}

async function arbeitnow(): Promise<Job[]> {
  const data = await fetchJson<{
    data?: Array<Record<string, unknown>>;
  }>("https://www.arbeitnow.com/api/job-board-api");

  return (data.data ?? []).map((item) => ({
    id: "arbeitnow:" + String(item.slug ?? item.url),
    source: "arbeitnow" as const,
    title: String(item.title ?? "Untitled role"),
    company: String(item.company_name ?? "Unknown company"),
    location: String(item.location ?? "Remote"),
    remote: Boolean(item.remote),
    url: String(item.url ?? "https://www.arbeitnow.com/"),
    description: stripHtml(String(item.description ?? "")),
    tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
    postedAt: safeDate(
      typeof item.created_at === "number"
        ? Number(item.created_at) * 1000
        : item.created_at,
    ),
  }));
}

async function headHunter(query: string): Promise<Job[]> {
  const url = new URL("https://api.hh.ru/vacancies");

  if (query) url.searchParams.set("text", query);
  url.searchParams.set("per_page", "50");
  url.searchParams.set("page", "0");

  const data = await fetchJson<{
    items?: Array<Record<string, unknown>>;
  }>(url.toString(), {
    headers: {
      "User-Agent":
        process.env.JOBRAIN_USER_AGENT ??
        "JoBrain/1.0 (https://github.com/b-1-o/JoBrain)",
    },
  });

  return (data.items ?? []).map((item) => {
    const salary = item.salary as Record<string, unknown> | null;

    const salaryText =
      salary && (salary.from || salary.to)
        ? (salary.currency ? String(salary.currency) + " " : "") +
          (salary.from ? String(salary.from) : "") +
          (salary.from && salary.to ? "–" : "") +
          (salary.to ? String(salary.to) : "")
        : undefined;

    return {
      id: "hh:" + String(item.id),
      source: "hh" as const,
      title: String(item.name ?? "Untitled role"),
      company: String(
        (item.employer as Record<string, unknown> | undefined)?.name ??
          "Unknown company",
      ),
      location: String(
        (item.area as Record<string, unknown> | undefined)?.name ?? "Unknown",
      ),
      remote: String(item.schedule ?? "").toLowerCase().includes("удал"),
      url: String(item.alternate_url ?? item.url ?? "https://hh.ru/"),
      description: stripHtml(
        String(item.snippet ? JSON.stringify(item.snippet) : ""),
      ),
      tags: [],
      salary: salaryText,
      postedAt: safeDate(item.published_at),
    };
  });
}

export async function searchJobs(params: JobSearchParams) {
  const normalized = {
    ...params,
    query: params.query.trim(),
    location: params.location.trim(),
    limit: Math.min(Math.max(params.limit || 60, 10), 120),
  };

  const tasks: Array<{
    source: JobSource;
    run: () => Promise<Job[]>;
  }> = [
    { source: "remoteok", run: remoteOk },
    { source: "remotive", run: () => remotive(normalized.query) },
    { source: "arbeitnow", run: arbeitnow },
    { source: "hh", run: () => headHunter(normalized.query) },
  ];

  const selected =
    normalized.source === "all"
      ? tasks
      : tasks.filter((task) => task.source === normalized.source);

  const settled = await Promise.allSettled(selected.map((task) => task.run()));
  const results: Job[] = [];
  const sources: Record<string, "ok" | "error"> = {};

  settled.forEach((result, index) => {
    const source = selected[index].source;

    if (result.status === "fulfilled") {
      sources[source] = "ok";
      results.push(...result.value);
    } else {
      sources[source] = "error";
    }
  });

  const jobs = Array.from(
    new Map(results.map((job) => [job.id, job])).values(),
  )
    .filter((job) => matches(job, normalized))
    .sort(
      (a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    )
    .slice(0, normalized.limit);

  return {
    jobs,
    sources,
    fetchedAt: new Date().toISOString(),
  };
}