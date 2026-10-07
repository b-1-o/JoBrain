# JoBrain Production Hardening Plan

Branch: `ai/production-hardening`

## Phase 1 — Security foundation
- Centralize Zod request validation for API handlers.
- Add Upstash Redis rate limiting with production fail-closed configuration.
- Add origin/CSRF protection for state-changing requests.
- Harden response security headers.
- Verify Prisma `directUrl` / Neon environment documentation.

## Phase 2 — Test infrastructure
- Add Vitest API integration coverage with MSW.
- Add reusable Prisma repository tests with an injectable test boundary.
- Add Playwright E2E coverage for search → save/track → pipeline.
- Extend CI to run API/E2E checks without requiring production secrets.

## Phase 3 — Product workflows
- Add application CSV export and calendar/iCal export.
- Add notification toasts for successful/failed mutations.
- Add reminder email service for next actions / last contact.
- Add customizable application statuses and safe transition helpers.

## Phase 4 — Performance / observability
- Cache normalized job-search responses in Upstash Redis.
- Add TanStack Query cache orchestration to the search UI.
- Add Sentry-compatible error instrumentation.
- Audit image/font loading and Next.js rendering boundaries.

## Phase 5 — Documentation / developer experience
- Expand README with architecture, API and environment reference.
- Add CONTRIBUTING.md and MIT LICENSE.
- Add Storybook coverage for visual primitives including PatternWaves.

## Verification
After each implementation block, CI must execute:
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
The final PR must report the exact GitHub Actions results and any remaining limitations.
