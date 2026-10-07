import * as Sentry from "@sentry/nextjs";

export function captureError(
  error: unknown,
  context?: Record<string, string | number | boolean | undefined>,
) {
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value !== undefined) scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
