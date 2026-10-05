import { config } from "@/config";
import { sendWaitlistConfirmation } from "@/lib/email";
import { claimJob, reclaimStuckJobs } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type Payload = { email: string };
let activeJobs = 0;

function log(message: string) {
  console.log(`${new Date().toISOString()} [pid ${process.pid}] ${message}`);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function processOne() {
  const job = await claimJob();
  if (!job) return false;
  activeJobs += 1;
  log(`[claimed] job ${job.id} currently processing: ${activeJobs}/${config.worker.concurrency}`);
  let outcome: "succeeded" | "retry-scheduled" | "dead" | "failed-to-finalize" = "failed-to-finalize";
  let completionLog: string | undefined;
  try {
    if (job.type !== "waitlist_confirmation") throw new Error(`Unknown job type: ${job.type}`);
    const payload = job.payload as Payload;
    if (config.worker.testDelayMs > 0) {
      log(`[test-delay] job ${job.id} holding for ${config.worker.testDelayMs}ms`);
      await wait(config.worker.testDelayMs);
    }
    // Re-sending this confirmation is safe: it is informational and has no destructive side effect.
    await sendWaitlistConfirmation(payload.email);
    await prisma.job.update({ where: { id: job.id }, data: { status: "succeeded", finishedAt: new Date(), startedAt: null, lastError: null } });
    outcome = "succeeded";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextAttempts = job.attempts + 1;
    const dead = nextAttempts >= job.maxAttempts;
    const jitter = Math.floor(Math.random() * (config.worker.backoffJitterMaxMs + 1));
    const backoffDelayMs = dead ? undefined : config.worker.backoffBaseDelayMs * 2 ** job.attempts + jitter;
    const nextRunAt = dead ? job.runAt : new Date(Date.now() + backoffDelayMs!);
    await prisma.job.update({ where: { id: job.id }, data: { status: dead ? "dead" : "failed", attempts: { increment: 1 }, runAt: nextRunAt, finishedAt: dead ? new Date() : null, startedAt: null, lastError: message } });
    completionLog = dead
      ? `[dead] job ${job.id} final attempt ${nextAttempts}/${job.maxAttempts}`
      : `[retry-scheduled] job ${job.id} attempt ${nextAttempts}/${job.maxAttempts}, delay ${backoffDelayMs}ms, next run ${nextRunAt.toISOString()}`;
    outcome = dead ? "dead" : "retry-scheduled";
  } finally {
    activeJobs -= 1;
    log(completionLog ?? `[${outcome}] job ${job.id} currently processing: ${activeJobs}/${config.worker.concurrency}`);
  }
  return true;
}

async function main() {
  log(`Worker started with concurrency ${config.worker.concurrency}`);
  let lastSweep = 0;
  while (true) { if (Date.now() - lastSweep >= config.worker.sweepIntervalMs) { await reclaimStuckJobs(); lastSweep = Date.now(); } const results = await Promise.all(Array.from({ length: config.worker.concurrency }, processOne)); if (!results.some(Boolean)) await new Promise((resolve) => setTimeout(resolve, config.worker.pollIntervalMs)); }
}

main().catch(async (error) => { console.error(`${new Date().toISOString()} [pid ${process.pid}] ${error instanceof Error ? error.stack ?? error.message : String(error)}`); await prisma.$disconnect(); process.exitCode = 1; });
