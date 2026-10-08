"use client";

import { Clock3, ExternalLink, MapPin, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type JobResult = {
  id: string;
  platform: string;
  level: "intern" | "junior" | "mid" | "senior" | "lead" | null;
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

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}

function levelLabel(level: JobResult["level"]) {
  if (level === "intern") return "Intern / Entry";
  if (level === "junior") return "Junior";
  if (level === "mid") return "Mid";
  if (level === "senior") return "Senior";
  if (level === "lead") return "Lead / Staff";
  return "Any level";
}

function platformName(platform: string) {
  const labels: Record<string, string> = {
    linkedin: "LinkedIn",
    indeed: "Indeed",
    glassdoor: "Glassdoor",
    ziprecruiter: "ZipRecruiter",
    dice: "Dice",
    company: "Company",
    remoteok: "Remote OK",
    remotive: "Remotive",
    jobicy: "Jobicy",
    adzuna: "Adzuna US",
    other: "Other",
  };
  return labels[platform] ?? platform;
}

type Props = {
  jobs: JobResult[];
  loading: boolean;
  onTrack: (job: JobResult) => void;
  onResetFilters: () => void;
};

const PAGE_SIZE = 24;

export default function JobResultsList({ jobs, loading, onTrack, onResetFilters }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleJobs = useMemo(() => jobs.slice(0, visibleCount), [jobs, visibleCount]);
  const jobsKey = jobs.map((j) => j.id).join("|");

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [jobsKey]);

  return (
    <div className="jb-job-list">
      {visibleJobs.map((job, index) => (
        <article key={job.id} className="jb-job-row">
          <div className="jb-job-index">{String(index + 1).padStart(2, "0")}</div>
          <div className="jb-job-main">
            <div className="jb-job-overline">
              <span>{platformName(job.platform)}</span>
              {job.remote ? <span>REMOTE</span> : null}
              {job.level ? <span>{levelLabel(job.level)}</span> : null}
            </div>
            <h2>{job.title}</h2>
            <div className="jb-job-company">{job.company}</div>
            <div className="jb-job-meta">
              <span>
                <MapPin size={12} />
                {job.location || "Remote"}
              </span>
              <span>
                <Clock3 size={12} />
                {relativeTime(job.postedAt)}
              </span>
              {job.salary ? <span className="jb-job-salary">{job.salary}</span> : null}
            </div>
            <p className="jb-job-desc">
              {(job.description || "No description returned by source.").slice(0, 220)}
              {job.description && job.description.length > 220 ? "\u2026" : ""}
            </p>
            <div className="jb-tags">
              {job.tags.slice(0, 4).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="jb-job-actions">
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="jb-open-link"
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
              Open <ExternalLink size={13} />
            </a>
            <button type="button" className="jb-track-button" onClick={() => onTrack(job)}>
              Track
              <Plus size={14} />
            </button>
          </div>
        </article>
      ))}

      {jobs.length > visibleCount ? (
        <div className="jb-results-more">
          <button
            type="button"
            className="jb-button jb-button-ghost"
            onClick={() => setVisibleCount((count) => Math.min(jobs.length, count + PAGE_SIZE))}
          >
            Show more roles ({jobs.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}

      {!jobs.length && !loading ? (
        <div className="jb-empty-search">
          <span>00</span>
          <strong>No roles matched this view.</strong>
          <p>Broaden the query or reset the filters.</p>
          <button type="button" className="jb-button jb-button-ghost" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
