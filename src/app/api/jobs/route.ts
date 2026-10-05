import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const allowed = ["pending", "processing", "succeeded", "failed", "dead"];
  const jobs = await prisma.job.findMany({ where: status && allowed.includes(status) ? { status: status as "pending" | "processing" | "succeeded" | "failed" | "dead" } : undefined, orderBy: { createdAt: "desc" } });
  return NextResponse.json(jobs);
}
