# Contributing to JoBrain

## Development

1. Fork or branch from `main`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm install` and `npm run db:generate`.
4. Make a focused change.
5. Run the full verification set:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Pull requests

Keep commits focused and describe the user-visible or operational effect. Include tests for new logic and document new environment variables.

Do not commit credentials, generated `.env.local` files, database dumps, or provider API responses containing sensitive data.

## Database changes

Prisma schema changes must include a generated migration:

```bash
npx prisma migrate dev --name <descriptive_name>
```

Review the generated SQL before opening a PR.

## API changes

Route handlers should validate input with Zod, preserve workspace scoping, and use the shared security helpers for rate limiting and mutation origin checks.

## Design

JoBrain follows a restrained graphite/glass visual system. New UI should preserve the existing editorial hierarchy and motion language rather than introducing unrelated visual systems.


## Test infrastructure

Run MSW-backed integration tests with:

```bash
npm test
```

The Prisma integration test runs automatically when `TEST_DATABASE_URL` is configured. CI provisions PostgreSQL and applies migrations before running the suite.

Run browser E2E locally with:

```bash
npx playwright install chromium
npm run e2e
```

Start Storybook with:

```bash
npm run storybook
```

Build Storybook for CI:

```bash
npm run storybook:build
```

## Reminder worker

The deployed reminder endpoint is:

`/api/cron/reminders`

GitHub Actions invokes it every 15 minutes with the `x-jobrain-cron-secret` header. Configure repository secrets:

- `JOBRAIN_CRON_URL`
- `CRON_SECRET`

Use `?dryRun=1` to verify eligibility without sending mail.
