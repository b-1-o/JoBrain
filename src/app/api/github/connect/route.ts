import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/require-auth-user";

export const runtime = "nodejs";
const STATE_COOKIE = "jobrain_github_oauth_state";

function callbackUrl(request: Request) {
  return process.env.GITHUB_REDIRECT_URI?.trim() ||
    new URL("/api/github/callback", request.url).toString();
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=%2Fprojects", origin));
  }

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/projects?github=not-configured", origin));
  }

  const state = randomBytes(32).toString("hex");
  const authorization = new URL("https://github.com/login/oauth/authorize");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", callbackUrl(request));
  authorization.searchParams.set("scope", "read:user");
  authorization.searchParams.set("state", state);

  const response = NextResponse.redirect(authorization);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/github/callback",
    maxAge: 10 * 60,
  });
  return response;
}
