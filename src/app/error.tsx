"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <section>
        <p>JOBRAIN / ERROR</p>
        <h1>Something went wrong.</h1>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
