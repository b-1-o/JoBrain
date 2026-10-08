"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountNav from "@/components/AccountNav";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  remote: boolean;
  level: string | null;
  salary?: string;
};

export default function RecommendationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("Building recommendations from your recent searches…");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/recommendations", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error);
        if (!data.enabled) {
          setMessage("Search suggestions are disabled in Settings.");
          return;
        }
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setMessage(data.jobs?.length ? "" : "Search a few roles first and JoBrain will build recommendations here.");
      })
      .catch(() => {
        if (!cancelled) setMessage("Sign in to use personalized recommendations.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="recommendations" />
        <header className="account-head">
          <div>
            <div className="account-kicker">RECOMMENDATIONS / 06</div>
            <h1 className="account-title">Roles that look like your intent.</h1>
            <p className="account-copy">
              JoBrain reuses your recent searches, filters and remote preference to build a compact second-pass job feed.
            </p>
          </div>
          <Link className="account-button" href="/settings">
            Configure suggestions
          </Link>
        </header>

        {message ? <p className="account-muted">{message}</p> : null}

        <div className="project-grid">
          {jobs.map((job) => (
            <article className="project-card" key={job.id}>
              <div className="account-kicker">
                {job.platform}
                {job.remote ? " · REMOTE" : ""}
              </div>
              <h3 style={{ marginTop: 6 }}>{job.title}</h3>
              <p>
                {job.company} · {job.location || "Remote"}
                {job.level ? ` · ${job.level}` : ""}
              </p>
              {job.salary ? <p>{job.salary}</p> : null}
              <div className="project-links">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void fetch("/api/history", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "JOB_OPEN",
                        title: job.title,
                        company: job.company,
                        url: job.url,
                      }),
                    }).catch(() => undefined);
                  }}
                >
                  Open role ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
