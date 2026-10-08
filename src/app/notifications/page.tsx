"use client";

import { useEffect, useState } from "react";
import AccountNav from "@/components/AccountNav";

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

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setItems(Array.isArray(data.notifications) ? data.notifications : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  }

  return (
    <main className="account-page">
      <div className="account-shell">
        <AccountNav active="settings" />
        <header className="account-head">
          <div>
            <div className="account-kicker">NOTIFICATIONS / 05</div>
            <h1 className="account-title">Your JoBrain signal.</h1>
            <p className="account-copy">
              Application events and future job-alert matches land here. Read status stays synchronized with your account.
            </p>
          </div>
          <button className="account-button" type="button" onClick={() => void markAll()}>Mark all read</button>
        </header>

        <section className="account-card account-card-wide">
          <div className="history-list">
            {!items.length ? <p className="account-muted">Nothing here yet.</p> : null}
            {items.map((item) => (
              <article className="history-item" key={item.id}>
                <span className="history-type">{item.type.replaceAll("_", " ")}</span>
                <div>
                  <div className="history-title">{item.title}</div>
                  <div className="account-muted">{item.body}</div>
                </div>
                <time className="history-time" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
