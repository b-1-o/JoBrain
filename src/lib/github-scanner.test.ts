import { describe, expect, it, vi } from "vitest";
import {
  detectFramework,
  detectTechnologies,
  extractLiveUrl,
  parseGitHubRepositoryUrl,
  scanGitHubRepository,
  summarizeDescription,
} from "./github-scanner";

describe("parseGitHubRepositoryUrl", () => {
  it("accepts canonical public repository URLs", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
      ownerRepo: "vercel/next.js",
      canonicalUrl: "https://github.com/vercel/next.js",
    });
  });

  it("accepts trailing slash and .git suffix", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/b-1-o/JoBrain/")?.ownerRepo).toBe(
      "b-1-o/JoBrain",
    );
    expect(parseGitHubRepositoryUrl("https://github.com/b-1-o/JoBrain.git")?.ownerRepo).toBe(
      "b-1-o/JoBrain",
    );
  });

  it("rejects non-GitHub hosts and non-https schemes", () => {
    expect(parseGitHubRepositoryUrl("http://github.com/owner/repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://evil.com/github.com/owner/repo")).toBeNull();
  });

  it("rejects credentials, ports, and deep paths", () => {
    expect(parseGitHubRepositoryUrl("https://user:pass@github.com/owner/repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://github.com:443/owner/repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://github.com/owner/repo/tree/main")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://github.com/owner")).toBeNull();
  });

  it("rejects internal-looking and malformed owners", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/./repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://github.com/../repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("https://127.0.0.1/owner/repo")).toBeNull();
    expect(parseGitHubRepositoryUrl("not a url")).toBeNull();
  });
});

describe("technology detection", () => {
  it("maps package.json dependencies to technology tags", () => {
    const tags = detectTechnologies({ TypeScript: 100 }, ["next", "react", "zod", "unknown-pkg"]);
    expect(tags).toContain("TypeScript");
    expect(tags).toContain("Next.js");
    expect(tags).toContain("React");
    expect(tags).toContain("Zod");
    expect(tags).not.toContain("unknown-pkg");
  });

  it("detects framework from dependency set", () => {
    expect(detectFramework(["next", "react"])).toBe("Next.js");
    expect(detectFramework(["vite", "react"])).toBe("Vite + React");
    expect(detectFramework(["lodash"])).toBeNull();
  });
});

describe("live URL and description helpers", () => {
  it("prefers homepage then README deployment links", () => {
    expect(extractLiveUrl("https://jobrain.vercel.app", "")).toBe("https://jobrain.vercel.app");
    expect(extractLiveUrl(null, "Demo: https://app.netlify.app/demo")).toBe(
      "https://app.netlify.app/demo",
    );
    expect(extractLiveUrl(null, "no links here")).toBeNull();
  });

  it("summarizes description from README when missing", () => {
    const readme = "# Title\n\nThis is a longer first paragraph that explains the product clearly.\n";
    expect(summarizeDescription(null, readme, "Next.js")).toContain("longer first paragraph");
    expect(summarizeDescription("  Custom desc  ", readme, null)).toBe("Custom desc");
  });
});

describe("scanGitHubRepository", () => {
  it("only targets GitHub API hosts for a validated repo", async () => {
    const calls: string[] = [];
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);

      if (url === "https://api.github.com/repos/owner/demo") {
        return new Response(
          JSON.stringify({
            name: "demo",
            description: "A demo app",
            html_url: "https://github.com/owner/demo",
            homepage: "https://demo.vercel.app",
            default_branch: "main",
            private: false,
          }),
          { status: 200 },
        );
      }

      if (url === "https://api.github.com/repos/owner/demo/languages") {
        return new Response(JSON.stringify({ TypeScript: 80, CSS: 20 }), { status: 200 });
      }

      if (url.includes("/contents/package.json")) {
        const content = Buffer.from(
          JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } }),
        ).toString("base64");
        return new Response(JSON.stringify({ content, encoding: "base64" }), { status: 200 });
      }

      if (url.includes("raw.githubusercontent.com")) {
        return new Response("# Demo\n\nA polished Next.js product.", { status: 200 });
      }

      return new Response("{}", { status: 404 });
    });

    const parsed = parseGitHubRepositoryUrl("https://github.com/owner/demo");
    expect(parsed).not.toBeNull();

    const result = await scanGitHubRepository(parsed!, fakeFetch as typeof fetch);

    expect(result.name).toBe("demo");
    expect(result.liveUrl).toBe("https://demo.vercel.app");
    expect(result.technologies).toContain("Next.js");
    expect(result.framework).toBe("Next.js");
    expect(calls.every((url) => /github\.com|githubusercontent\.com/.test(url))).toBe(true);
    expect(calls.some((url) => url.includes("127.0.0.1") || url.includes("localhost"))).toBe(
      false,
    );
  });
});
