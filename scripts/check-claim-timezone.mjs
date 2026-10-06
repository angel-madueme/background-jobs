import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const id = crypto.randomBytes(6).toString("hex");
const idempotencyKey = `claim-timezone-check:${crypto.randomUUID()}`;

try {
  await prisma.job.create({
    data: {
      id,
      type: "timezone_check",
      payload: { email: "claim-timezone-check@example.com" },
      maxAttempts: 5,
      runAt: new Date(Date.now() + 30 * 60 * 1000),
      idempotencyKey,
    },
  });

  const claimed = await prisma.$queryRaw`
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

  if (claimed.some((job) => job.id === id)) {
    throw new Error("Timezone check failed: a job 30 minutes in the future was claimed");
  }

  console.log("Claim timezone check passed: future job was not claimed.");
} finally {
  await prisma.job.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
