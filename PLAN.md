# JoBrain Production Hardening Plan

Branch: `ai/followup-hardening`

## Phase 1 — Security foundation
- [x] Centralize Zod request validation for API handlers.
- [x] Add Upstash Redis rate limiting with production fail-closed configuration.
- [x] Add origin/CSRF protection for state-changing requests.
- [x] Harden response security headers.
- [x] Verify Prisma `directUrl` / Neon environment documentation.

## Phase 2 — Test infrastructure
- [x] Add Vitest API integration coverage.
- [x] Add MSW handlers for external job providers.
- [x] Add Prisma integration coverage against ephemeral PostgreSQL in CI.
- [x] Add Playwright E2E coverage for search → track → pipeline → CSV export.
- [x] Add Storybook stories for PatternWaves, ColorBends, DotField and workflow controls.
- [x] Extend CI with PostgreSQL migration setup.

## Phase 3 — Product workflows
- [x] Add application CSV export and calendar/iCal export.
- [x] Add Sonner notification toasts.
- [x] Add SMTP reminder worker with dry-run mode and Redis deduplication.
- [x] Add workspace custom status definitions.
- [x] Add interview dates.
- [x] Keep `nextActionAt` as the follow-up date to avoid duplicate schema fields.

## Phase 4 — Performance / observability
- [x] Cache normalized job-search responses in Upstash Redis.
- [x] Add TanStack Query cache orchestration to the search UI.
- [x] Add Sentry client/server/edge instrumentation and route/worker capture.
- [x] Add global client error boundary.

## Phase 5 — Infrastructure / scheduling
- [x] Replace the Vercel Hobby daily reminder cron with GitHub Actions every 15 minutes.
- [x] Protect the cron endpoint with `CRON_SECRET` + rate limiting.
- [x] Add `dryRun=1` support for reminder verification.
- [x] Document GitHub repository secrets required for the reminder workflow.

## Phase 6 — Documentation
- [x] Expand README with architecture, API, environment and operations.
- [x] Add CONTRIBUTING.md and MIT LICENSE.
- [x] Document Storybook, Playwright, MSW and Prisma integration workflows.

## Verification
The primary CI workflow runs:
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

The PR also has dedicated E2E and reminder workflows. Screenshots are not attached because no browser session is available in this execution environment; this limitation is recorded in Issue #3.
