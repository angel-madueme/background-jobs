import crypto from "node:crypto";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { config } from "@/config";

function log(message: string) {
  console.log(`${new Date().toISOString()} [pid ${process.pid}] ${message}`);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function idempotencyKeyFor(email: string) {
  return crypto.createHash("sha256").update(`waitlist_confirmation:${normalizeEmail(email)}`).digest("hex");
}

export function newJobId() {
  return customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 12)();
}

export async function reclaimStuckJobs() {
  // Date is an absolute UTC instant; Prisma binds it against the UTC wall-clock column value.
  const cutoff = new Date(Date.now() - config.worker.stuckJobTimeoutMs);
  const stuckJobs = await prisma.job.findMany({
    where: { status: "processing", startedAt: { lt: cutoff } },
    select: { id: true, startedAt: true, attempts: true, maxAttempts: true },
  });

  for (const job of stuckJobs) {
    const nextAttempts = job.attempts + 1;
    const dead = nextAttempts >= job.maxAttempts;
    const result = await prisma.job.updateMany({
      where: { id: job.id, status: "processing", startedAt: job.startedAt },
      data: {
        attempts: nextAttempts,
        status: dead ? "dead" : "pending",
        runAt: new Date(),
        startedAt: null,
        finishedAt: dead ? new Date() : null,
        lastError: "Job reclaimed after worker timeout",
      },
    });

    if (result.count === 1) {
      if (dead) {
        log(`[sweep-dead] job ${job.id} stuck in processing since ${job.startedAt?.toISOString()}, marked dead, attempts now ${nextAttempts}`);
      } else {
        log(`[sweep] job ${job.id} stuck in processing since ${job.startedAt?.toISOString()}, reset to pending, attempts now ${nextAttempts}`);
      }
    }
  }
}

export async function claimJob() {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    -- Job timestamps are UTC wall-clock values in timestamp without time zone columns.
    UPDATE "Job" SET status = 'processing'::"JobStatus", "startedAt" = (NOW() AT TIME ZONE 'UTC'), "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE id = (
      SELECT id FROM "Job"
      -- Compare the stored UTC wall-clock value to the UTC wall-clock value from the database.
      WHERE (status = 'pending'::"JobStatus" OR status = 'failed'::"JobStatus") AND "runAt" <= (NOW() AT TIME ZONE 'UTC')
      ORDER BY "runAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING id
  `;
  return rows[0] ? prisma.job.findUnique({ where: { id: rows[0].id } }) : null;
}
