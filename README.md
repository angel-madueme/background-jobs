# Background jobs waitlist

Small Next.js + Prisma + PostgreSQL demo of reliable asynchronous email delivery.

## Setup

1. Start a local PostgreSQL database and copy `.env.example` to `.env`.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` to valid Resend values.
3. Install dependencies with `npm install`.
4. Create the database tables with `npx prisma migrate dev --name init`.
5. Run the app with `npm run dev` and the separate worker with `npm run worker`.

The signup form only creates a database row. The worker claims due jobs atomically with `FOR UPDATE SKIP LOCKED`, sends through the real Resend API, retries with exponential backoff, and moves exhausted jobs to `dead`. Visit `/jobs` for status and dead-letter visibility.

All worker tunables live in `src/config/index.ts`.
