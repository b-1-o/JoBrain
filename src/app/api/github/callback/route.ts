import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/require-auth-user";

export const runtime = "nodejs";
const STATE_COOKIE = "jobrain_github_oauth_state";

function callbackUrl(request: Request) {
  return process.env.GITHUB_REDIRECT_URI?.trim() ||
    new URL("/api/github/callback", request.url).toString();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function projectsRedirect(request: Request, status: string) {
  const url = new URL("/projects", request.url);
  url.searchParams.set("github", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const state = url.searchParams.get("state") ?? "";
  const storedState = (request as Request & { cookies?: { get: (name: string) => { value: string } | undefined } })
    .cookies?.get(STATE_COOKIE)?.value ?? "";

  const user = await requireAuthUser().catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/sign-in?redirect_url=%2Fprojects", origin));

  const fail = (status: string) => {
    const response = projectsRedirect(request, status);
    response.cookies.set(STATE_COOKIE, "", { path: "/api/github/callback", maxAge: 0 });
    return response;
  };

  if (!state || !storedState || !safeEqual(state, storedState)) return fail("state-error");
  const providerError = url.searchParams.get("error");
  if (providerError) return fail("denied");

  const code = url.searchParams.get("code");
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!code || !clientId || !clientSecret) return fail("not-configured");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl(request),
        state,
      }),
      cache: "no-store",
    });
    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) return fail("token-error");

    const githubResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: \`Bearer \${tokenData.access_token}\`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": process.env.JOBRAIN_USER_AGENT ?? "JoBrain/1.0",
      },
      cache: "no-store",
    });
    if (!githubResponse.ok) return fail("profile-error");

    const githubUser = (await githubResponse.json()) as {
      id?: number;
      login?: string;
      type?: string;
    };
    if (!githubUser.id || !githubUser.login || githubUser.type === "Organization") {
      return fail("profile-error");
    }

    await prisma.gitHubConnection.upsert({
      where: { userId: user.id },
      update: {
        githubUserId: String(githubUser.id),
        login: githubUser.login,
      },
      create: {
        userId: user.id,
        githubUserId: String(githubUser.id),
        login: githubUser.login,
      },
    });

    const response = projectsRedirect(request, "connected");
    response.cookies.set(STATE_COOKIE, "", { path: "/api/github/callback", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[JoBrain] GitHub OAuth callback failed.", error);
    return fail("connection-error");
  }
}
