function envNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const config = {
  worker: {
    concurrency: 5,
    maxAttempts: 5,
    backoffBaseDelayMs: 1_000,
    backoffJitterMaxMs: 250,
    stuckJobTimeoutMs: envNumber("STUCK_JOB_TIMEOUT_MS", 2 * 60_000),
    sweepIntervalMs: envNumber("STUCK_JOB_SWEEP_INTERVAL_MS", 30_000),
    testDelayMs: envNumber("WORKER_TEST_DELAY_MS", 0),
    pollIntervalMs: 1_000,
  },
  email: {
    from: process.env.EMAIL_FROM ?? "Waitlist <onboarding@resend.dev>",
  },
} as const;
