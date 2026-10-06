# AGENTS.md: background-jobs

## What this is
Task 2 of a bootcamp assignment: a background job system proving 
reliable async processing. The product concept is a simple waitlist 
signup — email in, confirmation email out via a real job queue. This 
is a standalone project, unrelated to any other repo. No live product 
depends on it.

## Non-negotiable rules
- Timestamps are UTC without time zone, so raw SQL must compare against 
  (NOW() AT TIME ZONE 'UTC').
- Stack: Next.js (App Router), TypeScript, Prisma, PostgreSQL (local, 
  not hosted — no cold-start handling needed).
- Email delivery: Resend's real API (RESEND_API_KEY from env). Never 
  mock or simulate the send — the whole point is testing a real, 
  unreliable external call.
- UI: two screens only. The waitlist signup screen (/) matches 
  design-reference/waitlist-signup.png and waitlist-joined.png. It is 
  the signup form, not a separate landing page. The /jobs screen stays 
  functional and plain but uses the same fonts, colours and spacing; job 
  detail opens as a modal. 
  No nav, no auth, no other pages. Design references are local only 
  and must never be committed.
- Every tunable value (concurrency cap, max attempts, backoff base 
  delay, stuck-job timeout) lives in src/config, never hardcoded in a 
  handler or the worker loop.

## Data model: Job
- id (nanoid, 12-char alphanumeric, never sequential)
- type (string, e.g. "waitlist_confirmation")
- payload (JSON) — for this job type: { email }
- status: pending | processing | succeeded | failed | dead
- attempts (int, default 0)
- maxAttempts (int, from config, default 5)
- lastError (text, nullable)
- runAt (datetime) — when this job becomes eligible to run
- startedAt (datetime, nullable)
- finishedAt (datetime, nullable)
- idempotencyKey (string, unique) — for this job type, derive it from 
  the email (e.g. a hash of "waitlist_confirmation:" + email) so 
  submitting the same email twice returns the existing job instead of 
  creating a second one
- createdAt, updatedAt

failed and dead are different states. failed means an attempt failed and 
the job is waiting for its next run with backoff. dead means retries are 
exhausted and a person must look at it.

## Enqueue path
POST /api/waitlist, body { email }.
- Validate email format. Invalid: 400.
- Compute the idempotency key from the email. If a job with that key 
  already exists, return 200 with the existing job's id and status 
  (not a new one) — do not create a duplicate row.
- Otherwise, insert a new Job row with status pending, runAt = now, 
  attempts 0. Return 202 with the job id and status.
- This endpoint must never do the actual email send inline. It only 
  writes the row and returns.

## Worker
A separate process (a script run via `npm run worker`, not part of 
the Next.js server) that loops:
1. Atomically claim one pending or failed job whose runAt has passed: a 
   single UPDATE statement moving status pending or failed -> processing 
   and setting startedAt, using a WHERE clause that only matches currently-
   eligible rows, so two workers racing can never both claim the same row. 
   Never read-then-write.
2. Respect a concurrency cap from config (default 5) — the worker 
   processes at most N jobs at once.
3. Call Resend to send the confirmation email. The email send itself 
   must be idempotent: if this job's email was already sent 
   successfully, note explicitly in code comments why re-sending is 
   safe for this job type (it's just a confirmation, so a duplicate 
   send is harmless, not dangerous).
4. On success: status succeeded, finishedAt set.
5. On failure: increment attempts, store the error in lastError. If 
   attempts < maxAttempts: status becomes failed, runAt = now + 
   backoff. Backoff is exponential with jitter: baseDelayMs * 2^attempts 
   + random jitter, baseDelayMs from config (default 1000ms). If 
   attempts >= maxAttempts: status dead.
6. A separate sweep (can run in the same worker loop on an interval, 
   from config, default every 30s): any job stuck in processing for 
   longer than a timeout (from config, default 2 minutes) gets reset 
   to pending with attempts incremented, as if it failed — this 
   condition is dead with finishedAt set when attempts reach maxAttempts; 
   otherwise it remains pending for retry. This recovers from a worker 
   crashing mid-job.

Testing-only worker variables are WORKER_TEST_DELAY_MS, 
STUCK_JOB_TIMEOUT_MS and STUCK_JOB_SWEEP_INTERVAL_MS.

## API endpoints
- POST /api/waitlist — enqueue, described above
- GET /api/jobs — list all jobs, newest first, for the status screen. 
  Support a status query filter.
- GET /api/jobs/:id — single job detail (payload, lastError, attempts, 
  timestamps)
- POST /api/jobs/:id/retry — only valid on a job with status dead. 
  Resets it to pending, attempts stays as-is (so maxAttempts history 
  is visible), runAt = now. 404 if job doesn't exist, 409 if job is 
  not dead.

## Screens
1. Waitlist signup (/) — one email input, one "Join Waitlist" button. 
   On submit, call POST /api/waitlist. Success state replaces the 
   input/button with a disabled filled state and a checkmark message: 
   "You're on the waitlist." (same message whether this was a new 
   signup or a repeat submission — don't expose idempotency logic in 
   the UI copy). Error state for invalid email format.
2. Jobs status (/jobs) — table of all jobs: id, status badge, 
   attempts, createdAt, runAt. A filter/tab to isolate dead jobs. 
   Clicking a row opens a modal detail view showing payload, lastError, 
   attempts and timestamps. The modal closes with its X, Escape, or an 
   outside-card click. A "Retry" button appears only on dead jobs and calls 
   POST /api/jobs/:id/retry, then refetches the list.

## Commit discipline
Small commits, one logical change each. Never commit .env. Keep 
.env.example current with DATABASE_URL and RESEND_API_KEY placeholders.

## Conflicts
If a request conflicts with this file, stop and tell me before acting.
