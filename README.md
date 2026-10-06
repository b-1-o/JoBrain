# JoBrain

Трекер заявок на работу с realtime-поиском вакансий и аналитикой воронки. Сделан потому что вести таблицу в Google Sheets неудобно, а видеть, где теряешь офферы — важно.

## Запуск

1. `cp .env.example .env.local`
2. Заполни `DATABASE_URL` из https://console.neon.tech
3. `npm install`
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev`

Скрипты `db:*` автоматически подхватывают `.env.local` через `dotenv-cli`.

## Стек (Stage 1)

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL (Neon)
- Auth.js (NextAuth v5) — в следующих батчах
