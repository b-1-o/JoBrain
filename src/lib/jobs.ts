export type JobSource =
  | "remoteok"
  | "remotive"
  | "jobicy"
  | "adzuna"
  | "googlejobs";

export type JobPlatform =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "ziprecruiter"
  | "dice"
  | "company"
  | "remoteok"
  | "remotive"
  | "jobicy"
  | "adzuna"
  | "other";

export type ExperienceLevel =
  | "all"
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead";

export type Job = {
  id: string;
  source: JobSource;
  platform: JobPlatform;
  level: Exclude<ExperienceLevel, "all"> | null;
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
  platform: JobPlatform | "all";
  experience: ExperienceLevel;
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
  extensions = "",
) {
  return /\bremote\b|work from home|anywhere|worldwide|distributed/i.test(
    title + " " + location + " " + description + " " + extensions,
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTokens(query: string) {
  return normalizeText(query)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function tokenMatches(token: string, haystack: string) {
  const aliases: Record<string, string[]> = {
    frontend: [
      "frontend",
      "front end",
      "front-end",
      "ui developer",
      "web developer",
    ],
    backend: ["backend", "back end", "back-end", "server developer"],
    developer: ["developer", "engineer", "programmer"],
    engineer: ["engineer", "developer"],
    javascript: ["javascript", "js", "typescript", "ts"],
    typescript: ["typescript", "ts"],
    react: ["react", "react.js", "reactjs"],
    nextjs: ["next.js", "nextjs", "next"],
    "next.js": ["next.js", "nextjs", "next"],
    ui: ["ui", "user interface"],
    ux: ["ux", "user experience"],
  };

  return (aliases[token] ?? [token]).some((alias) =>
    haystack.includes(normalizeText(alias)),
  );
}

function detectExperienceLevel(
  title: string,
  description: string,
): Exclude<ExperienceLevel, "all"> | null {
  const text = normalizeText(title + " " + description);

  if (
    /\bintern\b|internship|apprentice|apprenticeship|new grad|entry level|entry-level|early career/.test(
      text,
    )
  ) {
    return "intern";
  }

  if (
    /\bjunior\b|\bjr\b|associate developer|associate engineer/.test(text)
  ) {
    return "junior";
  }

  if (/\blead\b|\bstaff\b|\bprincipal\b|head of/.test(text)) {
    return "lead";
  }

  if (
    /\bsenior\b|\bsr\b|senior level|experienced developer|experienced engineer/.test(
      text,
    )
  ) {
    return "senior";
  }

  if (
    /\bmid\b|mid level|mid-level|intermediate|3\+? years|4\+? years|5\+? years/.test(
      text,
    )
  ) {
    return "mid";
  }

  return null;
}

function matches(job: Job, params: JobSearchParams) {
  const haystack = normalizeText(
    job.title +
      " " +
      job.company +
      " " +
      job.location +
      " " +
      job.description +
      " " +
      job.tags.join(" "),
  );

  const query = queryTokens(params.query);
  const location = normalizeText(params.location);

  if (
    query.length &&
    !query.every((token) => tokenMatches(token, haystack))
  ) {
    const titleAndTags = normalizeText(
      job.title + " " + job.tags.join(" "),
    );

    if (!query.some((token) => tokenMatches(token, titleAndTags))) {
      return false;
    }
  }

  if (location && !normalizeText(job.location).includes(location)) return false;
  if (params.remoteOnly && !job.remote) return false;
  if (
    params.platform !== "all" &&
    job.platform !== params.platform
  ) {
    return false;
  }

  if (
    params.experience !== "all" &&
    job.level !== params.experience
  ) {
    return false;
  }

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
  const data = await fetchJson<unknown[]>("https://remoteok.com/api", {
    headers: {
      "User-Agent":
        process.env.JOBRAIN_USER_AGENT ??
        "JoBrain/1.0 (https://github.com/b-1-o/JoBrain)",
    },
  });

  return data
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && "slug" in item,
    )
    .map((item) => {
      const title = String(item.position ?? "Untitled role");
      const description = stripHtml(String(item.description ?? ""));
      const location = String(item.location ?? "Remote");

      return {
        id: "remoteok:" + String(item.id ?? item.slug),
        source: "remoteok" as const,
        platform: "remoteok" as const,
        level: detectExperienceLevel(title, description),
        title,
        company: String(item.company ?? "Unknown company"),
        location,
        remote: true,
        url: String(
          item.url ??
            ("https://remoteok.com/remote-jobs/" + String(item.slug)),
        ),
        description,
        tags: Array.isArray(item.tags)
          ? item.tags.map(String).slice(0, 8)
          : [],
        salary:
          item.salary_min || item.salary_max
            ? (item.salary_min ? "$" + item.salary_min : "") +
              (item.salary_min && item.salary_max ? "–" : "") +
              (item.salary_max ? "$" + item.salary_max : "")
            : undefined,
        postedAt: safeDate(item.date),
      };
    });
}

async function remotive(query: string): Promise<Job[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");

  const search = queryTokens(query)[0];
  if (search) url.searchParams.set("search", search);
  url.searchParams.set("limit", "100");

  const data = await fetchJson<{
    jobs?: Array<Record<string, unknown>>;
  }>(url.toString());

  return (data.jobs ?? []).map((item) => {
    const location = String(item.candidate_required_location ?? "Remote");
    const description = stripHtml(
      String(item.description ?? item.job_type ?? ""),
    );
    const title = String(item.title ?? "Untitled role");

    return {
      id: "remotive:" + String(item.id ?? item.url),
      source: "remotive" as const,
      platform: "remotive" as const,
      level: detectExperienceLevel(title, description),
      title,
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

async function jobicy(query: string): Promise<Job[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", "100");
  url.searchParams.set("geo", "usa");

  const search = queryTokens(query)[0];
  if (search) url.searchParams.set("tag", search);

  const data = await fetchJson<{
    jobs?: Array<Record<string, unknown>>;
  }>(url.toString());

  return (data.jobs ?? []).map((item) => {
    const title = String(item.jobTitle ?? "Untitled role");
    const description = stripHtml(
      String(item.jobDescription ?? item.jobExcerpt ?? ""),
    );

    return {
      id: "jobicy:" + String(item.id ?? item.url),
      source: "jobicy" as const,
      platform: "jobicy" as const,
      level: detectExperienceLevel(title, description),
      title,
      company: String(item.companyName ?? "Unknown company"),
      location: String(item.jobGeo ?? "USA"),
      remote: true,
      url: String(item.url ?? "https://jobicy.com/"),
      description,
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
    };
  });
}

async function adzuna(query: string): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error("Adzuna credentials are not configured");
  }

  const url = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
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
      platform: "adzuna" as const,
      level: detectExperienceLevel(title, description),
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
          ? (item.salary_currency
              ? String(item.salary_currency) + " "
              : "$") +
            (item.salary_min ? String(item.salary_min) : "") +
            (item.salary_min && item.salary_max ? "–" : "") +
            (item.salary_max ? String(item.salary_max) : "")
          : undefined,
      postedAt: safeDate(item.created),
    };
  });
}

type GoogleJobsResponse = {
  jobs_results?: Array<Record<string, unknown>>;
  serpapi_pagination?: {
    next_page_token?: string;
  };
};

function googlePlatform(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("linkedin")) return "linkedin" as const;
  if (normalized.includes("indeed")) return "indeed" as const;
  if (normalized.includes("glassdoor")) return "glassdoor" as const;
  if (normalized.includes("ziprecruiter")) return "ziprecruiter" as const;
  if (normalized.includes("dice")) return "dice" as const;
  if (
    normalized.includes("company") ||
    normalized.includes("workday") ||
    normalized.includes("greenhouse") ||
    normalized.includes("lever")
  ) {
    return "company" as const;
  }

  return "other" as const;
}

async function googleJobs(
  query: string,
  location: string,
  remoteOnly: boolean,
  experience: ExperienceLevel,
): Promise<Job[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  const searchTerms = [
    query || "software developer",
    experience === "intern" ? "internship entry level" : "",
    experience === "junior" ? "junior entry level" : "",
    experience === "mid" ? "mid level intermediate" : "",
    experience === "senior" ? "senior" : "",
    experience === "lead" ? "lead staff principal" : "",
    remoteOnly ? "remote" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const jobs: Job[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < 3; page += 1) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("q", searchTerms);
    url.searchParams.set("gl", "us");
    url.searchParams.set("hl", "en");
    url.searchParams.set("google_domain", "google.com");

    if (location) {
      url.searchParams.set("location", location);
    }

    if (nextPageToken) {
      url.searchParams.set("next_page_token", nextPageToken);
    }

    const data = await fetchJson<GoogleJobsResponse>(url.toString());

    for (const item of data.jobs_results ?? []) {
      const title = String(item.title ?? "Untitled role");
      const company = String(item.company_name ?? "Unknown company");
      const itemLocation = String(item.location ?? "United States");
      const description = stripHtml(String(item.description ?? ""));
      const extensions = Array.isArray(item.extensions)
        ? item.extensions.map(String).join(" ")
        : "";

      const applyOptions = Array.isArray(item.apply_options)
        ? item.apply_options.filter(
            (value): value is Record<string, unknown> =>
              !!value && typeof value === "object",
          )
        : [];

      const providerLabels = [
        String(item.via ?? ""),
        ...applyOptions.map((option) => String(option.title ?? "")),
      ].filter(Boolean);

      const platform =
        providerLabels.map(googlePlatform).find((value) => value !== "other") ??
        "other";

      const applyOption =
        applyOptions.find(
          (option) => googlePlatform(String(option.title ?? "")) === platform,
        ) ?? applyOptions[0];

      const directUrl =
        typeof applyOption?.link === "string"
          ? applyOption.link
          : typeof item.share_link === "string"
            ? item.share_link
            : "https://www.google.com/search";

      jobs.push({
        id: "googlejobs:" + String(item.job_id ?? item.share_link ?? title),
        source: "googlejobs",
        platform,
        level: detectExperienceLevel(title, description),
        title,
        company,
        location: itemLocation,
        remote:
          Boolean(
            (item.detected_extensions as Record<string, unknown> | undefined)
              ?.work_from_home,
          ) || jobIsRemote(title, itemLocation, description, extensions),
        url: directUrl,
        description,
        tags: Array.isArray(item.extensions)
          ? item.extensions.map(String).slice(0, 8)
          : [],
        salary: Array.isArray(item.extensions)
          ? item.extensions
              .map(String)
              .find((value) => /\$|salary|per hour|\/yr|\/year/i.test(value))
          : undefined,
        postedAt: safeDate(
          (item.detected_extensions as Record<string, unknown> | undefined)
            ?.posted_at ??
            extensions.match(
              /(?:just now|\d+\s+(?:minute|hour|day|week)s?\s+ago)/i,
            )?.[0],
        ),
      });
    }

    nextPageToken = data.serpapi_pagination?.next_page_token;
    if (!nextPageToken) break;
  }

  return jobs;
}

export async function searchJobs(params: JobSearchParams) {
  const normalized = {
    ...params,
    query: params.query.trim(),
    location: params.location.trim(),
    experience: params.experience ?? "all",
    platform: params.platform ?? "all",
    limit: Math.min(Math.max(params.limit || 60, 10), 120),
  };

  const tasks: Array<{
    source: JobSource;
    run: () => Promise<Job[]>;
  }> = [
    { source: "googlejobs", run: () =>
      googleJobs(
        normalized.query,
        normalized.location,
        normalized.remoteOnly,
        normalized.experience,
      ) },
    { source: "remoteok", run: remoteOk },
    { source: "remotive", run: () => remotive(normalized.query) },
    { source: "jobicy", run: () => jobicy(normalized.query) },
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
