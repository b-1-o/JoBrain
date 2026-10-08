/**
 * Strict public GitHub repository URL parsing and scan helpers.
 * Rejects anything that is not a public github.com owner/repo path
 * to prevent SSRF via arbitrary fetch targets.
 */

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

export type ParsedGitHubRepo = {
  owner: string;
  repo: string;
  ownerRepo: string;
  canonicalUrl: string;
};

export type ScannedProject = {
  repositoryUrl: string;
  name: string;
  description: string | null;
  liveUrl: string | null;
  languages: Record<string, number>;
  technologies: string[];
  readme: string;
  framework: string | null;
};

const OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const TECH_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-dom": "React",
  typescript: "TypeScript",
  vite: "Vite",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  angular: "Angular",
  express: "Express",
  nestjs: "NestJS",
  "@nestjs/core": "NestJS",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  tailwindcss: "Tailwind CSS",
  prisma: "Prisma",
  drizzle: "Drizzle",
  "@clerk/nextjs": "Clerk",
  "@tanstack/react-query": "TanStack Query",
  "framer-motion": "Framer Motion",
  gsap: "GSAP",
  ogl: "OGL",
  "react-hook-form": "React Hook Form",
  zod: "Zod",
  zustand: "Zustand",
  redux: "Redux",
  "@reduxjs/toolkit": "Redux",
  three: "Three.js",
  "@react-three/fiber": "React Three Fiber",
  graphql: "GraphQL",
  "@apollo/client": "Apollo",
  trpc: "tRPC",
  "@trpc/server": "tRPC",
  supabase: "Supabase",
  "@supabase/supabase-js": "Supabase",
  firebase: "Firebase",
  stripe: "Stripe",
  redis: "Redis",
  "@upstash/redis": "Upstash Redis",
};

const FRAMEWORK_HINTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["next"], label: "Next.js" },
  { keys: ["nuxt"], label: "Nuxt" },
  { keys: ["@sveltejs/kit"], label: "SvelteKit" },
  { keys: ["vite", "react"], label: "Vite + React" },
  { keys: ["vite", "vue"], label: "Vite + Vue" },
  { keys: ["@nestjs/core"], label: "NestJS" },
  { keys: ["express"], label: "Express" },
  { keys: ["react"], label: "React" },
  { keys: ["vue"], label: "Vue" },
  { keys: ["svelte"], label: "Svelte" },
];

/**
 * Parse and validate a user-supplied GitHub repository URL.
 * Only allows https://github.com/{owner}/{repo} (optional trailing slash / .git).
 * Rejects credentials, ports, query strings used as path confusion, and non-GitHub hosts.
 */
export function parseGitHubRepositoryUrl(input: string): ParsedGitHubRepo | null {
  const raw = input.trim();
  if (!raw || raw.length > 256) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.username || url.password) return null;
  if (url.port) return null;

  const segments = url.pathname
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean);

  if (segments.length !== 2) return null;

  const [owner, repo] = segments;
  if (!owner || !repo) return null;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;
  if (repo === "." || repo === "..") return null;

  const ownerRepo = `${owner}/${repo}`;
  return {
    owner,
    repo,
    ownerRepo,
    canonicalUrl: `https://github.com/${ownerRepo}`,
  };
}

export function detectTechnologies(
  languages: Record<string, number>,
  dependencies: string[],
): string[] {
  const fromLangs = Object.keys(languages);
  const fromDeps = dependencies
    .map((dep) => TECH_MAP[dep])
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set([...fromLangs, ...fromDeps])).slice(0, 24);
}

export function detectFramework(dependencies: string[]): string | null {
  const set = new Set(dependencies);
  for (const hint of FRAMEWORK_HINTS) {
    if (hint.keys.every((key) => set.has(key))) return hint.label;
  }
  return null;
}

export function extractLiveUrl(
  homepage: string | null | undefined,
  readme: string,
): string | null {
  if (homepage && /^https?:\/\//i.test(homepage.trim())) {
    return homepage.trim().slice(0, 2048);
  }

  const match = readme.match(
    /https?:\/\/(?:[^\s)\]]+(?:vercel\.app|netlify\.app|github\.io|pages\.dev|railway\.app|onrender\.com)[^\s)\]]*)/i,
  );
  return match?.[0]?.slice(0, 2048) ?? null;
}

export function summarizeDescription(
  description: string | null | undefined,
  readme: string,
  framework: string | null,
): string | null {
  if (description?.trim()) return description.trim().slice(0, 500);

  const firstParagraph = readme
    .replace(/^#+\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find((part) => part.length > 40);

  if (firstParagraph) return firstParagraph.slice(0, 500);
  if (framework) return `${framework} project.`;
  return null;
}

function githubHeaders(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": process.env.JOBRAIN_USER_AGENT ?? "JoBrain/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Scan a validated public GitHub repository. All network calls target
 * api.github.com / raw.githubusercontent.com only, using the parsed owner/repo.
 */
export async function scanGitHubRepository(
  parsed: ParsedGitHubRepo,
  fetchImpl: typeof fetch = fetch,
): Promise<ScannedProject> {
  const headers = githubHeaders();
  const { ownerRepo } = parsed;

  const repoResponse = await fetchImpl(`https://api.github.com/repos/${ownerRepo}`, {
    headers,
    cache: "no-store",
  });
  if (!repoResponse.ok) {
    throw new Error("GitHub repository could not be read.");
  }

  const repoData = (await repoResponse.json()) as {
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    default_branch: string;
    private?: boolean;
  };

  if (repoData.private) {
    throw new Error("Only public GitHub repositories can be scanned.");
  }

  const [languagesResponse, packageResponse, readmeResponse] = await Promise.all([
    fetchImpl(`https://api.github.com/repos/${ownerRepo}/languages`, {
      headers,
      cache: "no-store",
    }),
    fetchImpl(
      `https://api.github.com/repos/${ownerRepo}/contents/package.json?ref=${encodeURIComponent(repoData.default_branch)}`,
      { headers, cache: "no-store" },
    ),
    fetchImpl(
      `https://raw.githubusercontent.com/${ownerRepo}/${encodeURIComponent(repoData.default_branch)}/README.md`,
      {
        headers: { "User-Agent": process.env.JOBRAIN_USER_AGENT ?? "JoBrain/1.0" },
        cache: "no-store",
      },
    ),
  ]);

  const languages = (
    languagesResponse.ok ? await languagesResponse.json() : {}
  ) as Record<string, number>;

  let dependencies: string[] = [];
  if (packageResponse.ok) {
    const packagePayload = (await packageResponse.json()) as {
      content?: string;
      encoding?: string;
    };
    if (packagePayload.content && packagePayload.encoding === "base64") {
      try {
        const packageJson = JSON.parse(
          Buffer.from(packagePayload.content, "base64").toString("utf8"),
        ) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        dependencies = Object.keys({
          ...(packageJson.dependencies ?? {}),
          ...(packageJson.devDependencies ?? {}),
        });
      } catch {
        // Ignore malformed package.json
      }
    }
  }

  const readme = readmeResponse.ok ? (await readmeResponse.text()).slice(0, 20000) : "";
  const framework = detectFramework(dependencies);
  const technologies = detectTechnologies(languages, dependencies);
  const liveUrl = extractLiveUrl(repoData.homepage, readme);
  const description = summarizeDescription(repoData.description, readme, framework);

  return {
    repositoryUrl: repoData.html_url || parsed.canonicalUrl,
    name: repoData.name || parsed.repo,
    description,
    liveUrl,
    languages,
    technologies,
    readme,
    framework,
  };
}
