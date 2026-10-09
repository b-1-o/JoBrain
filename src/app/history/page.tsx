"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountNav from "@/components/AccountNav";
import LatticeLoader from "@/components/LatticeLoader";

type Event = {
  id: string;
  type: string;
  title: string | null;
  url: string | null;
  company: string | null;
  createdAt: string;
};

export default function HistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/history?take=100", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setEvents(Array.isArray(data.history) ? data.history : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="history" />
        <header className="account-head">
          <div>
            <div className="account-kicker">HISTORY / 04</div>
            <h1 className="account-title">Your discovery trail.</h1>
            <p className="account-copy">Searches, opened roles and outbound links become a useful memory instead of disappearing into browser history.</p>
          </div>
          <Link className="account-button" href="/settings">History settings</Link>
        </header>

        <section className="account-card account-card-wide">
          <div className="history-list">
            {loading ? <div className="account-operation"><LatticeLoader label="Loading history" status="working" cellSize={5} gap={2} fontSize={11} showTimer={false} /></div> : null}
            {!loading && !events.length ? <p className="account-muted">No activity recorded yet.</p> : null}
            {events.map((event) => (
              <article className="history-item" key={event.id}>
                <span className="history-type">{event.type.replaceAll("_", " ")}</span>
                <div>
                  <div className="history-title">{event.title || event.url || "JoBrain activity"}</div>
                  {event.company ? <div className="account-muted">{event.company}</div> : null}
                </div>
                <time className="history-time" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
