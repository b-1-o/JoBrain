import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";
import {
  parseGitHubRepositoryUrl,
  scanGitHubRepository,
  type ScannedProject,
} from "@/lib/github-scanner";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function responseForProjectError(error: unknown) {
  console.error("[JoBrain] Project persistence failed.", error);
  return NextResponse.json(
    { error: "The project could not be saved to your portfolio. Please retry. If this continues, the database connection may be unavailable." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[JoBrain] Failed to load portfolio projects.", error);
    return NextResponse.json(
      { error: "Projects could not be loaded. Please retry. If this continues, the database connection may be unavailable." },
      { status: 500 },
    );
  }
}

/**
 * POST actions:
 * - { action: "scan", repositoryUrl } -> returns scanned draft (not saved)
 * - { action: "submit", project } -> persists after user review
 * - legacy: { repositoryUrl } -> scan + save (kept for compatibility)
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const action = typeof body.action === "string" ? body.action : "legacy";

    if (action === "scan" || action === "legacy") {
      const repositoryUrl = typeof body.repositoryUrl === "string" ? body.repositoryUrl.trim() : "";
      const parsed = parseGitHubRepositoryUrl(repositoryUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Enter a public GitHub repository URL (https://github.com/owner/repo)." },
          { status: 400 },
        );
      }

      let scanned: ScannedProject;
      try {
        scanned = await scanGitHubRepository(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub repository could not be read.";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (action === "scan") return NextResponse.json({ draft: scanned });
      return await persistProject(user.id, scanned);
    }

    if (action === "submit") {
      const project = body.project as Partial<ScannedProject> | undefined;
      if (!project || typeof project.repositoryUrl !== "string" || typeof project.name !== "string") {
        return NextResponse.json({ error: "Project payload is incomplete." }, { status: 400 });
      }

      const parsed = parseGitHubRepositoryUrl(project.repositoryUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid repository URL." }, { status: 400 });
      }

      const languages =
        project.languages && typeof project.languages === "object" && !Array.isArray(project.languages)
          ? (project.languages as Record<string, number>)
          : {};
      const technologies = isStringArray(project.technologies)
        ? project.technologies.map((technology) => technology.trim()).filter(Boolean).slice(0, 24)
        : [];

      const payload: ScannedProject = {
        repositoryUrl: parsed.canonicalUrl,
        name: project.name.trim().slice(0, 120) || parsed.repo,
        description:
          typeof project.description === "string" ? project.description.trim().slice(0, 2000) || null : null,
        liveUrl:
          typeof project.liveUrl === "string" && /^https?:\\/\\//i.test(project.liveUrl.trim())
            ? project.liveUrl.trim().slice(0, 2048)
            : null,
        languages,
        technologies,
        readme: typeof project.readme === "string" ? project.readme.slice(0, 20000) : "",
        framework: typeof project.framework === "string" ? project.framework : null,
      };

      return await persistProject(user.id, payload);
    }

    return NextResponse.json({ error: "Unknown project action." }, { status: 400 });
  } catch (error) {
    return responseForProjectError(error);
  }
}

async function persistProject(userId: string, scanned: ScannedProject) {
  try {
    const existing = await prisma.project.findUnique({
      where: { userId_repositoryUrl: { userId, repositoryUrl: scanned.repositoryUrl } },
    });

    const project = await prisma.project.upsert({
      where: { userId_repositoryUrl: { userId, repositoryUrl: scanned.repositoryUrl } },
      update: {
        name: scanned.name,
        description: scanned.description,
        liveUrl: scanned.liveUrl,
        languages: scanned.languages,
        technologies: scanned.technologies,
        readme: scanned.readme.slice(0, 20000),
      },
      create: {
        userId,
        repositoryUrl: scanned.repositoryUrl,
        name: scanned.name,
        description: scanned.description,
        liveUrl: scanned.liveUrl,
        languages: scanned.languages,
        technologies: scanned.technologies,
        readme: scanned.readme.slice(0, 20000),
      },
    });

    return NextResponse.json(
      { project, created: !existing },
      { status: existing ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return responseForProjectError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

    const result = await prisma.project.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) {
      return NextResponse.json({ error: "This project was not found in your portfolio." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseForProjectError(error);
  }
}
