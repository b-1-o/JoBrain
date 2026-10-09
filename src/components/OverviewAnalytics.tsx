"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mail, RefreshCw, TrendingUp } from "lucide-react";
import LatticeLoader from "@/components/LatticeLoader";

type Range = "7d" | "30d" | "90d";
type Point = { date: string; tracked: number; submitted: number };
type Analytics = {
  range: Range;
  startDate: string;
  endDate: string;
  trackedCount: number;
  submittedCount: number;
  series: Point[];
};

const rangeOptions: Array<{ value: Range; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function formatDate(value: string) {
  return new Date(value + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function OverviewAnalytics() {
  const [range, setRange] = useState<Range>("30d");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/analytics?range=" + range, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Analytics & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load job-search statistics.");
        if (!cancelled) {
          setAnalytics(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load statistics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  async function emailReport() {
    setEmailState("working");
    setEmailMessage("");
    try {
      const response = await fetch("/api/analytics/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      const data = (await response.json().catch(() => ({}))) as { sent?: boolean; email?: string; error?: string };
      if (!response.ok || !data.sent) throw new Error(data.error ?? "Could not send the report.");
      setEmailState("done");
      setEmailMessage("Report sent to " + (data.email ?? "your registered email") + ".");
    } catch (cause) {
      setEmailState("error");
      setEmailMessage(cause instanceof Error ? cause.message : "Could not send your report.");
    }
  }

  return (
    <section className="jb-analytics-panel" aria-labelledby="jb-analytics-title">
      <div className="jb-analytics-head">
        <div>
          <span className="jb-eyebrow"><span className="jb-eyebrow-line" /> YOUR PROGRESS / 02</span>
          <h2 id="jb-analytics-title">Activity overview</h2>
          <p>Track how your pipeline is growing and how many applications you’ve submitted.</p>
        </div>
        <div className="jb-analytics-controls">
          <div className="jb-analytics-range" aria-label="Statistics period">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={range === option.value ? "is-active" : ""}
                aria-pressed={range === option.value}
                onClick={() => {
                  setLoading(true);
                  setRange(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="jb-button jb-button-ghost jb-analytics-email" onClick={() => void emailReport()} disabled={emailState === "working"}>
            <Mail size={14} />
            Email report
          </button>
        </div>
      </div>

      <div className="jb-analytics-metrics">
        <article className="jb-analytics-metric">
          <span className="jb-analytics-metric-icon"><TrendingUp size={16} /></span>
          <span className="jb-analytics-metric-label">ROLES TRACKED</span>
          <strong>{loading ? "—" : analytics?.trackedCount ?? "—"}</strong>
          <small>Roles added to your pipeline during this period</small>
        </article>
        <article className="jb-analytics-metric">
          <span className="jb-analytics-metric-icon"><Mail size={16} /></span>
          <span className="jb-analytics-metric-label">APPLICATIONS SENT</span>
          <strong>{loading ? "—" : analytics?.submittedCount ?? "—"}</strong>
          <small>Applications moved beyond the “Found” stage</small>
        </article>
      </div>

      <div className="jb-analytics-chart-wrap">
        {loading ? (
          <div className="jb-analytics-loading">
            <LatticeLoader label="Updating activity" doneLabel="Updated" status="working" cellSize={6} gap={2} fontSize={12} showTimer />
            <div className="jb-analytics-skeleton" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          </div>
        ) : error ? (
          <div className="jb-analytics-empty">
            <p>{error}</p>
            <button type="button" className="jb-button jb-button-ghost" onClick={() => { setLoading(true); setRange((current) => current); }}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : analytics ? (
          <>
            <div className="jb-analytics-chart-caption">
              <span>{formatDate(analytics.startDate)} — {formatDate(analytics.endDate)}</span>
              <span><i className="is-tracked" /> Tracked <i className="is-submitted" /> Submitted</span>
            </div>
            <div className="jb-analytics-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.series} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="jbTrackedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9fbcd0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#9fbcd0" stopOpacity={0.015} />
                    </linearGradient>
                    <linearGradient id="jbSubmittedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4dfe8" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#d4dfe8" stopOpacity={0.005} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(190,205,215,.09)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#83919b", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fill: "#83919b", fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{ background: "rgba(9,12,15,.92)", border: "1px solid rgba(205,220,230,.15)", borderRadius: 12, backdropFilter: "blur(18px)", color: "#e8eef2", fontSize: 12 }}
                    itemStyle={{ color: "#e8eef2" }}
                  />
                  <Area type="monotone" dataKey="tracked" name="Tracked" stroke="#9fbcd0" strokeWidth={2} fill="url(#jbTrackedGradient)" activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#d4dfe8" strokeWidth={1.8} fill="url(#jbSubmittedGradient)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </div>
      {emailState !== "idle" ? (
        <div className={"jb-analytics-feedback is-" + emailState} role="status" aria-live="polite">
          <LatticeLoader
            label="Sending report"
            doneLabel="Sent"
            errorLabel="Could not send"
            status={emailState}
            cellSize={4}
            gap={1}
            fontSize={10}
            showTimer={false}
          />
          {emailMessage || (emailState === "working" ? "Preparing your report…" : "")}
        </div>
      ) : null}
      <p className="jb-analytics-note">Reports go only to the primary email address on your JoBrain account.</p>
    </section>
  );
}
