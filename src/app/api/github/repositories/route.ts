import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export const dynamic = "force-dynamic";

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  updated_at: string;
  default_branch: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
  owner?: { login?: string };
};

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Sign in to connect a GitHub account." }, { status: 401 });

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: { login: true, githubUserId: true, updatedAt: true },
    });
    if (!connection) {
      return NextResponse.json({ connected: false, login: null, repositories: [] }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const response = await fetch(
      \`https://api.github.com/users/\${encodeURIComponent(connection.login)}/repos?type=owner&sort=updated&per_page=100\`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": process.env.JOBRAIN_USER_AGENT ?? "JoBrain/1.0",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 404 || response.status === 403
          ? "GitHub temporarily hid or rate-limited this public repository list. Try again shortly."
          : "Could not load repositories from GitHub." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as GitHubRepository[];
    const repositories = payload
      .filter((repository) =>
        !repository.private &&
        !repository.archived &&
        repository.owner?.login?.toLowerCase() === connection.login.toLowerCase(),
      )
      .map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        url: repository.html_url,
        description: repository.description,
        language: repository.language,
        updatedAt: repository.updated_at,
        defaultBranch: repository.default_branch,
        fork: repository.fork,
        verifiedOwner: true,
      }));

    return NextResponse.json(
      { connected: true, login: connection.login, repositories },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[JoBrain] GitHub repository picker failed.", error);
    return NextResponse.json({ error: "Could not load your verified GitHub repositories." }, { status: 500 });
  }
}
