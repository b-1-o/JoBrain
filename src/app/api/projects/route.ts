import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const repositoryUrl = typeof body.repositoryUrl === "string" ? body.repositoryUrl.trim() : "";
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repositoryUrl)) {
    return NextResponse.json({ error: "Enter a public GitHub repository URL." }, { status: 400 });
  }

  const ownerRepo = repositoryUrl.replace(/\/$/, "").split("github.com/")[1];
  const apiHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": process.env.JOBRAIN_USER_AGENT ?? "JoBrain/1.0",
  };

  const repoResponse = await fetch(`https://api.github.com/repos/${ownerRepo}`, { headers: apiHeaders, cache: "no-store" });
  if (!repoResponse.ok) {
    return NextResponse.json({ error: "GitHub repository could not be read." }, { status: 400 });
  }

  const repoData = (await repoResponse.json()) as {
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    default_branch: string;
  };

  const [languagesResponse, packageResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${ownerRepo}/languages`, { headers: apiHeaders, cache: "no-store" }),
    fetch(`https://api.github.com/repos/${ownerRepo}/contents/package.json?ref=${encodeURIComponent(repoData.default_branch)}`, { headers: apiHeaders, cache: "no-store" }),
  ]);

  const languages = languagesResponse.ok ? await languagesResponse.json() : {};
  let technologies: string[] = Object.keys(languages);

  if (packageResponse.ok) {
    const packagePayload = (await packageResponse.json()) as { content?: string; encoding?: string };
    if (packagePayload.content && packagePayload.encoding === "base64") {
      try {
        const packageJson = JSON.parse(Buffer.from(packagePayload.content, "base64").toString("utf8")) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const allDeps = Object.keys({
          ...(packageJson.dependencies ?? {}),
          ...(packageJson.devDependencies ?? {}),
        });
        const techMap: Record<string, string> = {
          next: "Next.js",
          react: "React",
          typescript: "TypeScript",
          vite: "Vite",
          tailwindcss: "Tailwind CSS",
          prisma: "Prisma",
          "@clerk/nextjs": "Clerk",
          "@tanstack/react-query": "TanStack Query",
          "framer-motion": "Framer Motion",
          gsap: "GSAP",
          ogl: "OGL",
          "react-hook-form": "React Hook Form",
          zod: "Zod",
          zustand: "Zustand",
        };
        technologies = Array.from(new Set([
          ...technologies,
          ...allDeps.map((dep) => techMap[dep]).filter((value): value is string => Boolean(value)),
        ]));
      } catch {
        // Ignore malformed package.json content.
      }
    }
  }

  const readmeResponse = await fetch(
    `https://raw.githubusercontent.com/${ownerRepo}/${encodeURIComponent(repoData.default_branch)}/README.md`,
    { headers: { "User-Agent": apiHeaders["User-Agent"] }, cache: "no-store" },
  );
  const readme = readmeResponse.ok ? await readmeResponse.text() : "";

  const liveUrl =
    repoData.homepage ||
    readme.match(/https?:\/\/(?:[^\s)]+(?:vercel\.app|netlify\.app|github\.io|pages\.dev)[^\s)]*)/i)?.[0] ||
    null;

  const existing = await prisma.project.findUnique({
    where: { userId_repositoryUrl: { userId: user.id, repositoryUrl: repoData.html_url } },
  });

  const project = await prisma.project.upsert({
    where: { userId_repositoryUrl: { userId: user.id, repositoryUrl: repoData.html_url } },
    update: {
      name: repoData.name,
      description: repoData.description,
      liveUrl,
      languages,
      technologies,
      readme: readme.slice(0, 20000),
    },
    create: {
      userId: user.id,
      repositoryUrl: repoData.html_url,
      name: repoData.name,
      description: repoData.description,
      liveUrl,
      languages,
      technologies,
      readme: readme.slice(0, 20000),
    },
  });

  return NextResponse.json({ project, created: !existing }, { status: existing ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  await prisma.project.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
