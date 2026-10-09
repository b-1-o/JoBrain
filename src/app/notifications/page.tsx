"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import AccountNav from "@/components/AccountNav";
import LatticeLoader from "@/components/LatticeLoader";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(() => {
      void fetch("/api/notifications", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            setError("Sign in to view notifications.");
            return;
          }
          const data = (await response.json()) as { notifications?: Notification[] };
          setItems(Array.isArray(data.notifications) ? data.notifications : []);
          setError("");
        })
        .catch(() => setError("Could not load notifications."))
        .finally(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Could not mark notifications as read.");
      setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    } catch {
      setError("Could not mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="notifications" />
        <header className="account-head">
          <div>
            <div className="account-kicker">NOTIFICATIONS / 05</div>
            <h1 className="account-title">Your JoBrain signal.</h1>
            <p className="account-copy">
              Application events and future job-alert matches land here. Read status stays synchronized with your account.
            </p>
          </div>
          <button className="account-button" type="button" disabled={markingAll || loading || !items.some((item) => !item.readAt)} onClick={() => void markAll()}>
            {markingAll ? <LatticeLoader label="Marking read" status="working" cellSize={3} gap={1} fontSize={10} showTimer={false} /> : "Mark all read"}
          </button>
        </header>

        {error ? <p className="account-muted">{error}</p> : null}

        <section className="account-card account-card-wide">
          <div className="history-list">
            {loading ? <div className="account-operation"><LatticeLoader label="Loading notifications" status="working" cellSize={5} gap={2} fontSize={11} showTimer={false} /></div> : null}
            {!loading && !items.length && !error ? <p className="account-muted">Nothing here yet.</p> : null}
            {items.map((item) => (
              <article className={`history-item${item.readAt ? "" : " is-unread"}`} key={item.id}>
                <span className="history-type">{item.type.replaceAll("_", " ")}</span>
                <div>
                  {item.url ? (
                    <a className="history-title" href={item.url}>
                      {item.title}
                    </a>
                  ) : (
                    <div className="history-title">{item.title}</div>
                  )}
                  <div className="account-muted">{item.body}</div>
                </div>
                <time className="history-time" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
