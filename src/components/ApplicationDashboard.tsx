"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import OverviewAnalytics from "@/components/OverviewAnalytics";

type Status = "FOUND" | "APPLIED" | "SCREENING" | "TECH" | "OFFER" | "REJECTED";

export type DashboardApplication = {
  id: string;
  company: string;
  role: string;
  url?: string | null;
  source: string;
  status: Status;
  appliedAt?: string | null;
  nextActionAt?: string | null;
  updatedAt: string;
  createdAt?: string;
};

type DashboardProps = {
  apps: DashboardApplication[];
  loading: boolean;
  onNavigate: (tab: "overview" | "search" | "pipeline") => void;
};

const statusLabels: Record<Status, string> = {
  FOUND: "Found",
  APPLIED: "Applied",
  SCREENING: "Interview",
  TECH: "Technical",
  OFFER: "Offer",
  REJECTED: "Closed",
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateLabel(value: string, withTime = false) {
  const date = parseDate(value);
  if (!date) return "Date not set";
  return date.toLocaleDateString(undefined, withTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function ActivityLabel({ app }: { app: DashboardApplication }) {
  const nextAction = parseDate(app.nextActionAt);
  const applied = parseDate(app.appliedAt);
  const updated = parseDate(app.updatedAt);
  const now = startOfDay(new Date());

  if (nextAction && nextAction >= now) {
    return <span className="jb-dashboard-event-type is-upcoming"><Clock3 size={12} /> Follow-up · {localDateLabel(nextAction.toISOString())}</span>;
  }
  if (applied) return <span className="jb-dashboard-event-type is-applied"><CheckCircle2 size={12} /> Applied · {localDateLabel(applied.toISOString())}</span>;
  return <span className="jb-dashboard-event-type"><RefreshCw size={12} /> Updated {updated ? format(updated, "MMM d") : ""}</span>;
}

export default function ApplicationDashboard({ apps, loading, onNavigate }: DashboardProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());
  const todayKey = today.getTime();

  const calendarDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }), [month]);

  const activeCount = apps.filter((app) => ["FOUND", "APPLIED", "SCREENING", "TECH"].includes(app.status)).length;
  const appliedCount = apps.filter((app) => ["APPLIED", "SCREENING", "TECH", "OFFER"].includes(app.status)).length;
  const interviewCount = apps.filter((app) => ["SCREENING", "TECH"].includes(app.status)).length;
  const offerCount = apps.filter((app) => app.status === "OFFER").length;
  const createdThisMonth = apps.filter((app) => {
    const createdAt = parseDate(app.createdAt);
    return createdAt && isSameMonth(createdAt, month);
  }).length;

  const upcoming = useMemo(() => apps
    .filter((app) => {
      const date = parseDate(app.nextActionAt);
      return date && date.getTime() >= todayKey && app.status !== "REJECTED" && app.status !== "OFFER";
    })
    .sort((a, b) => (parseDate(a.nextActionAt)?.getTime() ?? 0) - (parseDate(b.nextActionAt)?.getTime() ?? 0))
    .slice(0, 4), [apps, todayKey]);

  const recent = useMemo(() => [...apps]
    .sort((a, b) => (parseDate(b.updatedAt)?.getTime() ?? 0) - (parseDate(a.updatedAt)?.getTime() ?? 0))
    .slice(0, 5), [apps]);

  const selectedEvents = useMemo(() => apps.filter((app) => {
    const eventDates = [app.nextActionAt, app.appliedAt, app.createdAt, app.updatedAt]
      .map(parseDate)
      .filter((date): date is Date => Boolean(date));
    return eventDates.some((date) => isSameDay(date, selectedDay));
  }), [apps, selectedDay]);

  const monthLabel = format(month, "MMMM yyyy");

  return (
    <section className="jb-dashboard jb-view-panel" aria-labelledby="jb-dashboard-title">
      <header className="jb-dashboard-heading">
        <div>
          <span className="jb-eyebrow"><span className="jb-eyebrow-line" /> YOUR CAREER WORKSPACE</span>
          <h1 id="jb-dashboard-title">Your next move, <span>at a glance.</span></h1>
          <p>One place for applications, follow-ups, and progress. Your latest changes stay close at hand.</p>
        </div>
        <div className="jb-dashboard-primary-actions">
          <button type="button" className="jb-button jb-button-ghost" onClick={() => onNavigate("pipeline")}>
            <BriefcaseBusiness size={15} /> Open pipeline
          </button>
          <button type="button" className="jb-button jb-button-solid" onClick={() => onNavigate("search")}>
            <Plus size={16} /> Find a role
          </button>
        </div>
      </header>

      <div className="jb-dashboard-date-line">
        <span><CalendarDays size={14} /> {format(new Date(), "EEEE, MMMM d, yyyy")}</span>
        <span className="jb-dashboard-live"><i /> PERSONAL DASHBOARD</span>
      </div>

      <div className="jb-dashboard-stat-grid">
        <article className="jb-dashboard-stat-card">
          <span className="jb-dashboard-stat-icon is-green"><BriefcaseBusiness size={17} /></span>
          <span className="jb-dashboard-stat-label">IN YOUR PIPELINE</span>
          <strong>{loading ? "—" : apps.length}</strong>
          <small><span className="jb-dashboard-stat-note">All tracked roles</span></small>
        </article>
        <article className="jb-dashboard-stat-card">
          <span className="jb-dashboard-stat-icon"><TrendingUp size={17} /></span>
          <span className="jb-dashboard-stat-label">ACTIVE SEARCH</span>
          <strong>{loading ? "—" : activeCount}</strong>
          <small>{loading ? "Updating your numbers" : "Roles still in progress"}</small>
        </article>
        <article className="jb-dashboard-stat-card">
          <span className="jb-dashboard-stat-icon"><Target size={17} /></span>
          <span className="jb-dashboard-stat-label">INTERVIEWS</span>
          <strong>{loading ? "—" : interviewCount}</strong>
          <small>{loading ? "Updating your numbers" : "Screening and technical"}</small>
        </article>
        <article className="jb-dashboard-stat-card">
          <span className="jb-dashboard-stat-icon is-offer"><Sparkles size={17} /></span>
          <span className="jb-dashboard-stat-label">OFFERS</span>
          <strong>{loading ? "—" : offerCount}</strong>
          <small>{loading ? "Updating your numbers" : "Positive outcomes"}</small>
        </article>
      </div>

      <div className="jb-dashboard-main-grid">
        <section className="jb-dashboard-card jb-calendar-card" aria-labelledby="jb-calendar-title">
          <div className="jb-dashboard-card-heading">
            <div>
              <span className="jb-dashboard-overline">PLAN AHEAD</span>
              <h2 id="jb-calendar-title">Activity calendar</h2>
              <p>Applications, dates and upcoming follow-ups.</p>
            </div>
            <div className="jb-calendar-controls">
              <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => subMonths(current, 1))}><ArrowLeft size={15} /></button>
              <button type="button" aria-label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))}><ArrowRight size={15} /></button>
            </div>
          </div>

          <div className="jb-calendar-month-row">
            <strong>{monthLabel}</strong>
            <span>{loading ? "Syncing activity…" : createdThisMonth + " added this month"}</span>
          </div>

          <div className="jb-calendar-grid" role="grid" aria-label={monthLabel}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span className="jb-calendar-weekday" key={day} role="columnheader">{day}</span>
            ))}
            {calendarDays.map((day) => {
              const eventApps = apps.filter((app) => {
                const eventDates = [app.nextActionAt, app.appliedAt, app.createdAt, app.updatedAt]
                  .map(parseDate)
                  .filter((date): date is Date => Boolean(date));
                return eventDates.some((date) => isSameDay(date, day));
              });
              const selected = isSameDay(day, selectedDay);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  role="gridcell"
                  aria-label={format(day, "EEEE, MMMM d") + (eventApps.length ? ", " + eventApps.length + " activities" : "")}
                  aria-pressed={selected}
                  className={[
                    "jb-calendar-day",
                    isSameMonth(day, month) ? "" : "is-outside",
                    isToday(day) ? "is-today" : "",
                    selected ? "is-selected" : "",
                    eventApps.length ? "has-events" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    setSelectedDay(startOfDay(day));
                    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
                  }}
                >
                  <span>{format(day, "d")}</span>
                  {eventApps.length ? <i aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="jb-calendar-legend">
            <span><i className="is-today-dot" /> Today</span>
            <span><i className="is-event-dot" /> Activity</span>
            <span><i className="is-selected-dot" /> Selected</span>
          </div>

          <div className="jb-calendar-events">
            <div className="jb-calendar-events-title">
              <strong>{isToday(selectedDay) ? "Today" : format(selectedDay, "EEE, MMM d")}</strong>
              <span>{selectedEvents.length} {selectedEvents.length === 1 ? "item" : "items"}</span>
            </div>
            {selectedEvents.length ? selectedEvents.slice(0, 3).map((app) => (
              <button type="button" className="jb-calendar-event" key={app.id} onClick={() => onNavigate("pipeline")}>
                <span className="jb-calendar-event-dot" />
                <span className="jb-calendar-event-main">
                  <strong>{app.role}</strong>
                  <small>{app.company}</small>
                </span>
                <span className={"jb-dashboard-status is-" + app.status.toLowerCase()}>{statusLabels[app.status]}</span>
              </button>
            )) : (
              <div className="jb-calendar-empty">
                <span className="jb-calendar-empty-icon"><CalendarDays size={16} /></span>
                <span><strong>No activity planned</strong><small>Pick a date with a marker or add a follow-up in your pipeline.</small></span>
              </div>
            )}
          </div>
        </section>

        <div className="jb-dashboard-side-column">
          <section className="jb-dashboard-card jb-next-actions-card" aria-labelledby="jb-next-actions-title">
            <div className="jb-dashboard-card-heading">
              <div>
                <span className="jb-dashboard-overline">DON’T LET IT SLIP</span>
                <h2 id="jb-next-actions-title">Next actions</h2>
              </div>
              <button type="button" className="jb-dashboard-icon-action" onClick={() => onNavigate("pipeline")} aria-label="Open pipeline"><ArrowUpRight size={16} /></button>
            </div>
            {upcoming.length ? (
              <div className="jb-next-action-list">
                {upcoming.map((app) => {
                  const date = parseDate(app.nextActionAt)!;
                  const overdue = date < today;
                  return (
                    <button type="button" className="jb-next-action" key={app.id} onClick={() => onNavigate("pipeline")}>
                      <span className={"jb-next-action-date" + (overdue ? " is-overdue" : "")}>
                        <strong>{format(date, "d")}</strong>
                        <small>{format(date, "MMM")}</small>
                      </span>
                      <span className="jb-next-action-copy">
                        <strong>{app.role}</strong>
                        <small>{app.company}</small>
                        <span>{overdue ? "Follow-up overdue" : date < new Date(Date.now() + 86400000) ? "Due today" : format(date, "EEEE")}</span>
                      </span>
                      <ArrowRight className="jb-next-action-arrow" size={14} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="jb-dashboard-empty">
                <span className="jb-dashboard-empty-icon"><ListTodo size={17} /></span>
                <strong>No follow-ups scheduled</strong>
                <p>Add a next-action date to any application to keep your job search moving.</p>
                <button type="button" className="jb-dashboard-text-action" onClick={() => onNavigate("pipeline")}>Open pipeline <ArrowRight size={13} /></button>
              </div>
            )}
          </section>

          <section className="jb-dashboard-card jb-recent-card" aria-labelledby="jb-recent-title">
            <div className="jb-dashboard-card-heading">
              <div>
                <span className="jb-dashboard-overline">LATEST CHANGES</span>
                <h2 id="jb-recent-title">Recently updated</h2>
              </div>
              <button type="button" className="jb-dashboard-icon-action" onClick={() => onNavigate("pipeline")} aria-label="See all applications"><ArrowUpRight size={16} /></button>
            </div>
            {recent.length ? (
              <div className="jb-recent-updates">
                {recent.slice(0, 4).map((app) => (
                  <button type="button" className="jb-recent-update" key={app.id} onClick={() => onNavigate("pipeline")}>
                    <span className="jb-recent-update-mark"><BriefcaseBusiness size={14} /></span>
                    <span className="jb-recent-update-copy">
                      <strong>{app.company}</strong>
                      <small>{app.role}</small>
                      <span><ActivityLabel app={app} /></span>
                    </span>
                    <span className={"jb-dashboard-status is-" + app.status.toLowerCase()}>{statusLabels[app.status]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="jb-dashboard-empty jb-recent-empty">
                <span className="jb-dashboard-empty-icon"><Flame size={17} /></span>
                <strong>Your activity starts here</strong>
                <p>Search for a role and save it to your pipeline. Your latest updates will appear here.</p>
                <button type="button" className="jb-dashboard-text-action" onClick={() => onNavigate("search")}>Explore roles <ArrowRight size={13} /></button>
              </div>
            )}
          </section>

          <section className="jb-dashboard-month-note">
            <div className="jb-dashboard-month-icon"><ArrowDownRight size={17} /></div>
            <div>
              <strong>A little progress adds up.</strong>
              <p>{loading ? "Your monthly summary is loading." : appliedCount + " applications have moved beyond discovery" + (createdThisMonth ? ", with " + createdThisMonth + " roles added in " + format(month, "MMMM") : "") + "."}</p>
            </div>
          </section>
        </div>
      </div>

      <OverviewAnalytics />
    </section>
  );
}
