"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function NewsletterToggle() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/newsletter")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { subscribed?: boolean } | null) => {
        if (active) setSubscribed(data?.subscribed ?? false);
      })
      .catch(() => {
        if (active) setSubscribed(false);
      });
    return () => { active = false; };
  }, []);

  async function toggle() {
    setLoading(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: subscribed ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("newsletter");
      const data = await response.json() as { subscribed: boolean };
      setSubscribed(data.subscribed);
      toast.success(data.subscribed ? "Email updates enabled." : "Email updates disabled.");
    } catch {
      toast.error("Could not update email preferences.");
    } finally {
      setLoading(false);
    }
  }

  if (subscribed === null) return null;

  return (
    <button
      type="button"
      className={"jb-newsletter-toggle " + (subscribed ? "is-on" : "")}
      onClick={() => void toggle()}
      disabled={loading}
      title={subscribed ? "Disable JoBrain email updates" : "Enable JoBrain email updates"}
      aria-pressed={subscribed}
    >
      {subscribed ? "UPDATES ON" : "GET UPDATES"}
    </button>
  );
}
