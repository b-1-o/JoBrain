# JoBrain

> A production-minded job-search command center for discovering roles, tracking applications, and turning the hiring funnel into an actionable workspace.

[Live Demo](https://jobrain.vercel.app/) · [GitHub](https://github.com/b-1-o/JoBrain)

## What it does

- **Multi-source search** across Google Jobs/SerpApi, LinkedIn, Indeed, Glassdoor, ZipRecruiter, Dice, Adzuna, Jobicy, Remote OK, and Remotive.
- **Normalized filtering** by query, location, remote status, platform, experience, and result count.
- **Application pipeline** from FOUND → APPLIED → SCREENING → TECH → OFFER / REJECTED.
- **Workspace isolation** through a signed HTTP-only workspace cookie and user-scoped Prisma queries.
- **Live-search caching** with TanStack Query in the browser and optional Upstash Redis on the server.
- **CSV export** for spreadsheet workflows and **iCal export** for scheduled next actions.
- **Reminder delivery** through SMTP/Nodemailer with Redis-backed deduplication. GitHub Actions runs the authenticated reminder worker every 15 minutes.
- **Review-first Autofill companion** for application forms.

## Architecture

```
Browser
  ├─ Next.js App Router / React 19
  ├─ TanStack Query cache
  └─ Sonner notifications
        │
        ▼
Next.js Route Handlers
  ├─ Zod input validation
  ├─ Origin checks for mutations
  ├─ Upstash rate limiting
  ├─ Upstash search cache
  └─ Prisma workspace isolation
        │
        ├─ Job providers
        │    ├─ SerpApi / Google Jobs
        │    ├─ Remote OK
        │    ├─ Remotive
        │    ├─ Jobicy
        │    └─ Adzuna
        │
        └─ PostgreSQL / Neon
```

## API

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/jobs` | GET | Validated, rate-limited, cached multi-source job search |
| `/api/applications` | GET/POST/PATCH/DELETE | Workspace-scoped application CRUD |
| `/api/applications/export` | GET | `format=csv` or `format=ics` |
| `/api/demo` | POST | Seed deterministic demo applications |
| `/api/statuses` | GET/POST | Workspace-scoped canonical + custom application statuses |
| `/api/cron/reminders` | GET/POST | Authenticated 15-minute reminder worker with dry-run support |
| `/api/reminders` | GET/POST | Legacy authenticated SMTP reminder worker |

State-changing routes validate JSON payloads with Zod, apply origin checks, and use workspace-scoped Prisma filters.

## Environment

Copy `.env.example` to `.env.local`.

### Required for production

- `DATABASE_URL` — pooled Neon/PostgreSQL connection.
- `DIRECT_URL` — direct/non-pooled Neon connection for Prisma migrations.
- `JOBRAIN_USER_AGENT` — provider identification.
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Job providers

- `SERPAPI_API_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`

### Reminders

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `CRON_SECRET` — protects both the legacy bearer endpoint and the 15-minute cron endpoint.
- `JOBRAIN_CRON_URL` — local documentation value for the deployed app URL; the GitHub Actions workflow uses repository secrets `JOBRAIN_CRON_URL` and `CRON_SECRET`.

Never commit real credentials. `JOBRAIN_RATE_LIMIT_DISABLED` is intended only for local/CI development.

## Local development

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For database work:

```bash
npm run db:migrate
npm run db:studio
```

## Security and reliability

- Security headers are configured in `next.config.ts`.
- API mutations reject cross-origin requests.
- Search and mutation endpoints have separate rate limits.
- Search results are cached for 60 seconds when Upstash Redis is configured.
- Production rate limiting fails closed when its required Redis configuration is missing.
- Reminder sends use Redis deduplication keys.
- The production reminder schedule runs every 15 minutes from GitHub Actions instead of relying on Vercel Hobby cron frequency.
- Workspace data access is always scoped by the current workspace user.

## Scope and follow-ups

Open follow-up work is tracked in [Issue #3](https://github.com/b-1-o/JoBrain/issues/3). It covers the parts that require locally generated Prisma migrations or new package installation/lockfile generation: customizable statuses, a dedicated interview date, MSW, Playwright, Storybook, Sentry, and final browser screenshots.

## Companion extension

JoBrain integrates with the [Autofill extension](https://github.com/b-1-o/autofill) for review-first form filling.

## Project

**JoBrain — Job Search Intelligence**

Frontend Engineering · TypeScript · API Integration · Data Modeling · Product UI/UX · Browser Extension Integration

## License

MIT
