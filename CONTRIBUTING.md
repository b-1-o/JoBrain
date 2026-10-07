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
