import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/config";
import { idempotencyKeyFor, newJobId, normalizeEmail } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().trim().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  const email = normalizeEmail(parsed.data.email); const idempotencyKey = idempotencyKeyFor(email);
  const existing = await prisma.job.findUnique({ where: { idempotencyKey }, select: { id: true, status: true } });
  if (existing) return NextResponse.json(existing, { status: 200 });
  try { const job = await prisma.job.create({ data: { id: newJobId(), type: "waitlist_confirmation", payload: { email }, maxAttempts: config.worker.maxAttempts, runAt: new Date(), idempotencyKey }, select: { id: true, status: true } }); return NextResponse.json(job, { status: 202 }); } catch (error) { if ((error as { code?: string }).code === "P2002") { const job = await prisma.job.findUniqueOrThrow({ where: { idempotencyKey }, select: { id: true, status: true } }); return NextResponse.json(job, { status: 200 }); } throw error; }
}
