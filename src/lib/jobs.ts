export type JobSource = "remoteok" | "remotive" | "jobicy" | "adzuna";

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

function jobIsRemote(
  title: string,
  location: string,
  description: string,
) {
  return /\bremote\b|work from home|anywhere|worldwide|distributed/i.test(
    title + " " + location + " " + description,
  );
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

  return (data.jobs ?? []).map((item) => {
    const location = String(item.candidate_required_location ?? "Remote");
    const description = stripHtml(
      String(item.description ?? item.job_type ?? ""),
    );

    return {
      id: "remotive:" + String(item.id ?? item.url),
      source: "remotive" as const,
      title: String(item.title ?? "Untitled role"),
      company: String(item.company_name ?? "Unknown company"),
      location,
      remote: true,
      url: String(item.url ?? "https://remotive.com/"),
      description,
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
      salary: item.salary ? String(item.salary) : undefined,
      postedAt: safeDate(item.publication_date),
    };
  });
}

async function jobicy(): Promise<Job[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", "100");
  url.searchParams.set("geo", "usa");

  const data = await fetchJson<{
    jobs?: Array<Record<string, unknown>>;
  }>(url.toString());

  return (data.jobs ?? []).map((item) => ({
    id: "jobicy:" + String(item.id ?? item.url),
    source: "jobicy" as const,
    title: String(item.jobTitle ?? "Untitled role"),
    company: String(item.companyName ?? "Unknown company"),
    location: String(item.jobGeo ?? "USA"),
    remote: true,
    url: String(item.url ?? "https://jobicy.com/"),
    description: stripHtml(
      String(item.jobDescription ?? item.jobExcerpt ?? ""),
    ),
    tags: Array.isArray(item.jobIndustry)
      ? item.jobIndustry.map(String).slice(0, 8)
      : [],
    salary:
      item.salaryMin || item.salaryMax
        ? (item.salaryCurrency ? String(item.salaryCurrency) + " " : "") +
          (item.salaryMin ? String(item.salaryMin) : "") +
          (item.salaryMin && item.salaryMax ? "–" : "") +
          (item.salaryMax ? String(item.salaryMax) : "")
        : undefined,
    postedAt: safeDate(item.pubDate),
  }));
}

async function adzuna(query: string): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error("Adzuna credentials are not configured");
  }

  const url = new URL(
    "https://api.adzuna.com/v1/api/jobs/us/search/1",
  );
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("sort_by", "date");

  if (query) url.searchParams.set("what", query);

  const data = await fetchJson<{
    results?: Array<Record<string, unknown>>;
  }>(url.toString());

  return (data.results ?? []).map((item) => {
    const location =
      String(
        (item.location as Record<string, unknown> | undefined)?.display_name ??
          "United States",
      ) || "United States";

    const description = stripHtml(String(item.description ?? ""));
    const title = String(item.title ?? "Untitled role");

    return {
      id: "adzuna:" + String(item.id ?? item.redirect_url),
      source: "adzuna" as const,
      title,
      company: String(
        (item.company as Record<string, unknown> | undefined)?.display_name ??
          "Unknown company",
      ),
      location,
      remote: jobIsRemote(title, location, description),
      url: String(item.redirect_url ?? "https://www.adzuna.com/"),
      description,
      tags: item.category
        ? [
            String(
              (item.category as Record<string, unknown>).label ?? item.category,
            ),
          ]
        : [],
      salary:
        item.salary_min || item.salary_max
          ? (item.salary_currency ? String(item.salary_currency) + " " : "$") +
            (item.salary_min ? String(item.salary_min) : "") +
            (item.salary_min && item.salary_max ? "–" : "") +
            (item.salary_max ? String(item.salary_max) : "")
          : undefined,
      postedAt: safeDate(item.created),
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
    { source: "jobicy", run: jobicy },
    { source: "adzuna", run: () => adzuna(normalized.query) },
  ];

  const selected =
    normalized.source === "all"
      ? tasks
      : tasks.filter((task) => task.source === normalized.source);

  const settled = await Promise.allSettled(selected.map((task) => task.run()));
  const results: Job[] = [];
  const sources: Record<string, "ok" | "error"> = {};

  settled.forEach((result, index) => {
    const task = selected[index];
    if (!task) return;

    const source = task.source;

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
