# JoBrain

> A personal job-search command center for finding roles, tracking applications, and understanding the funnel instead of losing it in a spreadsheet.

**Repository:** https://github.com/b-1-o/JoBrain

## Why JoBrain?

Applying for jobs creates a messy workflow: search the same role across different sites, copy links into a spreadsheet, forget where an application came from, miss follow-ups, and only realize later that the funnel is leaking.

JoBrain turns that workflow into one workspace:

- **Realtime multi-source job search** with debounced search.
- **Application tracking** from first discovery through offer or rejection.
- **Visual funnel analytics** for active applications, interviews, offers, and drop-off.
- **One-click tracking** from a live job result into the pipeline.
- **Personal browser workspace isolation** using an HTTP-only cookie.
- **Source adapters** so new job boards can be added without rewriting the UI.

## Product

### Live Search

Search roles across multiple feeds at once:

| Source | Integration | Coverage |
| --- | --- | --- |
| Remote OK | Public JSON feed | Remote-first |
| Remotive | Public jobs API | Remote jobs |
| Arbeitnow | Free Job Board API | Multi-source European listings |
| HeadHunter | Official API | HH vacancies |

The server normalizes provider-specific responses into one Job model, filters the data, removes duplicate results, and returns a single feed to the client.

A failed provider does not break the entire search. Each source reports its own connection state.

### Application Funnel

Tracked roles move through:

~~~text
FOUND → APPLIED → SCREENING → TECH → OFFER
                         ↘ REJECTED
~~~

This makes the important question visible: **where are applications actually getting stuck?**

### Dashboard

The overview combines:

- tracked applications;
- active pipeline;
- interview-stage count;
- offer count and offer rate;
- rejection rate;
- stage-by-stage funnel visualization;
- source health;
- recent application activity;
- a compact funnel insight.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 5
- PostgreSQL / Neon
- Zod
- Lucide React
- Vitest

## Architecture

~~~text
src/
├── app/
│   ├── api/
│   │   ├── applications/route.ts
│   │   ├── demo/route.ts
│   │   └── jobs/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    ├── current-user.ts
    ├── jobs.ts
    └── prisma.ts
~~~

### Search flow

~~~text
Browser
   ↓
GET /api/jobs
   ↓
Promise.allSettled()
   ├── Remote OK
   ├── Remotive
   ├── Arbeitnow
   └── HeadHunter
   ↓
normalize → filter → deduplicate → sort
   ↓
UI
~~~

### Data model

The Prisma schema separates:

- User
- Application
- SavedSearch
- Auth.js Account / Session

The current UI uses a lightweight browser workspace identity so the project can run without OAuth credentials. Each browser gets its own workspace cookie. Auth.js can be connected later without redesigning the application model.

## Getting Started

### 1. Install

Requirements:

- Node.js 20+
- PostgreSQL / Neon
- npm

~~~bash
npm install
~~~

### 2. Configure environment

~~~bash
cp .env.example .env.local
~~~

At minimum:

~~~env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
~~~

For Neon, use the non-pooled connection string for DIRECT_URL when migrations need a direct database connection.

### 3. Prepare Prisma

~~~bash
npm run db:generate
npm run db:migrate:deploy
~~~

For local schema development:

~~~bash
npm run db:migrate
~~~

### 4. Start JoBrain

~~~bash
npm run dev
~~~

Open http://localhost:3000.

The dashboard starts empty. Use **Load demo** to populate a realistic application funnel, or start tracking roles from Live search.

## Quality Commands

~~~bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
~~~

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| DATABASE_URL | Yes | PostgreSQL connection |
| DIRECT_URL | Recommended | Direct PostgreSQL connection for Prisma migrations |
| JOBRAIN_USER_AGENT | Recommended | Descriptive User-Agent for the HH API |
| ADZUNA_APP_ID | No | Reserved for a future adapter |
| ADZUNA_APP_KEY | No | Reserved for a future adapter |
| NEXT_PUBLIC_APP_URL | No | Public deployment URL |

## Provider notes

Remote OK documents a public JSON feed and asks applications displaying its jobs to credit the source and link back to the original listing.

Remotive provides a public remote-jobs API for sharing listings with attribution. Its public feed is delayed compared with its private paid API.

Arbeitnow provides a free Job Search API without an API key.

HeadHunter documents an official JSON API and requires a descriptive User-Agent header.

JoBrain keeps these integrations isolated in src/lib/jobs.ts so provider changes do not leak into the UI or database layer.

## Design Direction

JoBrain deliberately avoids the look of a generic admin template:

- near-black canvas;
- translucent glass panels;
- subtle violet and blue signal colors;
- dense information hierarchy;
- restrained motion;
- responsive layouts;
- information shown before decoration.

The goal is a personal command center, not another spreadsheet.

## Current Scope

The project focuses on the highest-value loop:

**discover → track → move → analyze**

Natural next extensions are:

- authenticated accounts;
- UI for persistent saved searches;
- scheduled alerts;
- richer provider adapters;
- resume-to-job matching;
- follow-up reminders;
- historical time-series analytics.

## License

Private project by default. Add a license before accepting external contributions.