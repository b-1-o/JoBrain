# JoBrain

> A modern job-search command center for discovering roles, tracking applications, and visualizing the hiring pipeline.

[Live Demo](https://jobrain.vercel.app/) · [GitHub](https://github.com/b-1-o/JoBrain)

## What it does

JoBrain brings job discovery and application tracking into one focused workspace.

- **Multi-source job search** across Google Jobs, LinkedIn, Indeed, Glassdoor, ZipRecruiter, Dice, Adzuna, Jobicy, Remote OK, and Remotive
- **Smart filtering** by location, remote status, platform, and experience level
- **Application pipeline** from discovery to interview, offer, or rejection
- **Visual analytics** to see application progress and funnel performance
- **One-click tracking** to move interesting roles into the pipeline
- **Autofill companion extension** for faster, review-first job application form filling

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma
- PostgreSQL / Neon
- Zod
- Vitest
- Vercel

## Highlights

JoBrain is designed as a production-style SaaS experience rather than a basic job board clone. It combines live data aggregation, normalized job results, filtering, application state management, and a polished responsive interface in one product.

## Project

**JoBrain — Job Search Command Center**

Built to demonstrate:

**Frontend Engineering · TypeScript · API Integration · Data Modeling · Product UI/UX · Browser Extension Integration · Responsive Design**

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

## Status

Actively developed and deployed on Vercel.

## Author

**Erik G.**  
Frontend Developer · UI Engineer

[GitHub](https://github.com/b-1-o) · [LinkedIn](https://www.linkedin.com/in/b1o)

## Autofill

JoBrain includes a companion Chrome extension for review-first form autofill on supported job application platforms.

[Autofill GitHub](https://github.com/b-1-o/autofill)
