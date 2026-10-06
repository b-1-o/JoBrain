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
| Adzuna US | REST API | United States jobs |
| Jobicy | Public REST API | US-focused remote jobs |
| Remote OK | Public JSON feed | Worldwide remote jobs |
| Remotive | Public jobs API | Worldwide remote jobs |

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
   ├── Adzuna US
   ├── Jobicy
   ├── Remote OK
   └── Remotive
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
| JOBRAIN_USER_AGENT | No | Legacy User-Agent setting kept for compatibility |
| ADZUNA_APP_ID | Recommended | Adzuna US API application ID |
| ADZUNA_APP_KEY | Recommended | Adzuna US API application key |
| NEXT_PUBLIC_APP_URL | No | Public deployment URL |

## Provider notes

Adzuna provides a REST API for job advertisement listings and supports country-specific search; JoBrain uses its US endpoint for American listings.

Jobicy provides a public remote-jobs REST API with a US geo filter and structured job data.

Remote OK exposes a free public JSON feed of remote jobs and asks aggregators to credit the source and link to the original listing.

Remotive provides a public remote-jobs API for sharing listings with attribution and requires links back to the original Remotive listing.

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