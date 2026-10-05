import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({ where: { id }, select: { status: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "dead") return NextResponse.json({ error: "Only dead jobs can be retried" }, { status: 409 });
  const retried = await prisma.job.update({ where: { id }, data: { status: "pending", runAt: new Date(), startedAt: null, finishedAt: null }, select: { id: true, status: true } });
  return NextResponse.json(retried);
}
