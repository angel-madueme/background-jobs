"use client";

import { useEffect, useRef, useState } from "react";

type Job = { id: string; type: string; payload: unknown; status: string; attempts: number; maxAttempts: number; lastError: string | null; runAt: string; createdAt: string };
type JobDetail = Job & { startedAt: string | null; finishedAt: string | null; updatedAt: string };

const statusStyles: Record<string, string> = { pending: "bg-amber-100 text-amber-800", processing: "bg-blue-100 text-blue-800", succeeded: "bg-emerald-100 text-emerald-800", failed: "bg-orange-100 text-orange-800", dead: "bg-rose-100 text-rose-800" };

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export default function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Job | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [loading, setLoading] = useState(true);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const load = () => { setLoading(true); return fetch(`/api/jobs${filter ? `?status=${filter}` : ""}`).then((r) => r.json()).then(setJobs).finally(() => setLoading(false)); };
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [filter]);

  async function loadDetail(id: string) {
    setDetailLoading(true); setDetailError(""); setRetryError("");
    try { const response = await fetch(`/api/jobs/${id}`); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to load job detail"); setDetail(data); } catch (error) { setDetailError(error instanceof Error ? error.message : "Unable to load job detail"); } finally { setDetailLoading(false); }
  }

  function openDetail(job: Job) { setSelected(job); setDetail(null); void loadDetail(job.id); }
  function closeDetail() { const row = selected ? rowRefs.current[selected.id] : null; setSelected(null); setDetail(null); setDetailError(""); setRetryError(""); row?.focus(); }
  async function retry(id: string) { setRetrying(true); setRetryError(""); try { const response = await fetch(`/api/jobs/${id}/retry`, { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error ?? "Unable to retry job"); closeDetail(); await load(); } catch (error) { setRetryError(error instanceof Error ? error.message : "Unable to retry job"); } finally { setRetrying(false); } }

  useEffect(() => { if (!selected) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); }; document.body.style.overflow = "hidden"; document.addEventListener("keydown", onKeyDown); return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKeyDown); }; }, [selected]);

  const filterBase = "rounded-full border px-4 py-2 text-sm font-semibold shadow-none transition duration-200 hover:bg-[#fff4f2] hover:border-[#f3d7d4] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb8b0] focus-visible:ring-offset-2";
  const filterActive = "border-[#f5dfdc] bg-[#fff9f8] text-[#d96d69]";
  const filterInactive = "border-[#ededed] bg-white text-[#71809f] hover:text-[#d96d69]";

  return <div className="mt-10">
    <div className="mb-5 flex gap-2"><button onClick={() => setFilter("")} className={`${filterBase} ${!filter ? filterActive : filterInactive}`}>All</button><button onClick={() => setFilter("dead")} className={`${filterBase} ${filter === "dead" ? filterActive : filterInactive}`}>Dead letters</button></div>
    <div className="overflow-x-auto rounded-[24px] bg-white/90 shadow-[0_18px_45px_rgba(225,86,83,0.12)]"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[#f5dfda] text-[#71809f]"><tr><th className="p-4">ID</th><th className="p-4">Status</th><th className="p-4">Attempts</th><th className="p-4">Created</th><th className="p-4">Run at</th></tr></thead><tbody>{jobs.map((job) => <tr ref={(row) => { rowRefs.current[job.id] = row; }} tabIndex={0} role="button" aria-label={`Open details for job ${job.id}`} className="cursor-pointer border-b border-[#f7ebe8] last:border-0 transition hover:bg-[#fff8f5] hover:shadow-[inset_3px_0_0_#ff7a70] focus-visible:bg-[#fff8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffb8b0]" key={job.id} onClick={() => openDetail(job)} onKeyDown={(event) => { if (event.key === "Enter") openDetail(job); }}><td className="p-4 font-mono text-xs text-[#101218]">{job.id}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[job.status] ?? "bg-slate-100 text-slate-700"}`}>{job.status}</span></td><td className="p-4 text-[#34405b]">{job.attempts}/{job.maxAttempts}</td><td className="p-4 text-[#34405b]">{new Date(job.createdAt).toLocaleString()}</td><td className="p-4 text-[#34405b]">{new Date(job.runAt).toLocaleString()}</td></tr>)}</tbody></table>{loading ? <p className="p-8 text-center text-[#71809f]">Loading jobs…</p> : jobs.length === 0 && <p className="p-8 text-center text-[#71809f]">No jobs yet.</p>}</div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101218]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="job-detail-title"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f05252]">Job detail</p>{detail && <div className="mt-2 flex flex-wrap items-center gap-3"><h2 id="job-detail-title" className="font-mono text-sm font-semibold text-[#101218] sm:text-base">{detail.id}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[detail.status] ?? "bg-slate-100 text-slate-700"}`}>{detail.status}</span></div>}</div><button type="button" aria-label="Close job detail" onClick={closeDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#71809f] transition hover:bg-[#fff4f2] hover:text-[#f05252] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb8b0]"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none"><path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button></div>{detailLoading ? <p className="py-12 text-center text-sm text-[#71809f]">Loading job detail…</p> : detailError ? <p className="py-8 text-center text-sm text-[#e34d50]">{detailError} <button type="button" onClick={() => selected && loadDetail(selected.id)} className="font-semibold underline underline-offset-4 hover:text-[#b9363b]">Retry</button></p> : detail && <div className="mt-6 space-y-5"><div className="grid grid-cols-2 gap-6"><div className="rounded-2xl bg-[#fff8f5] p-4 text-sm"><p className="text-[#71809f]">Attempts</p><p className="mt-1 font-semibold text-[#101218]">{detail.attempts}/{detail.maxAttempts}</p></div><div className="rounded-2xl bg-[#fff8f5] p-4 text-sm"><p className="text-[#71809f]">Type</p><p className="mt-1 break-words font-semibold text-[#101218]">{detail.type}</p></div></div><div><p className="mb-2 text-sm font-semibold text-[#34405b]">Payload</p><pre className="overflow-x-auto rounded-2xl bg-[#f1f3f5] p-4 text-xs leading-6 text-[#34405b]">{JSON.stringify(detail.payload, null, 2)}</pre></div><div><p className="mb-2 text-sm font-semibold text-[#34405b]">Last error</p><p className="rounded-2xl bg-[#f1f3f5] p-4 text-sm text-[#71809f]">{detail.lastError ?? "No error"}</p></div><div className="grid gap-3 rounded-2xl border border-[#f5dfda] p-4 text-sm sm:grid-cols-2"><div><p className="text-[#71809f]">Created</p><p className="mt-1 text-[#34405b]">{formatTimestamp(detail.createdAt)}</p></div><div><p className="text-[#71809f]">Run at</p><p className="mt-1 text-[#34405b]">{formatTimestamp(detail.runAt)}</p></div><div><p className="text-[#71809f]">Started</p><p className="mt-1 text-[#34405b]">{formatTimestamp(detail.startedAt)}</p></div><div><p className="text-[#71809f]">Finished</p><p className="mt-1 text-[#34405b]">{formatTimestamp(detail.finishedAt)}</p></div></div>{retryError && <p className="rounded-xl bg-[#fff0ef] p-3 text-sm text-[#e34d50]">{retryError}</p>}{detail.status === "dead" && <button type="button" disabled={retrying} onClick={() => retry(detail.id)} className="rounded-full bg-[#f05252] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#df4448] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb8b0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{retrying ? "Retrying…" : "Retry"}</button>}</div>}</section></div>}
  </div>;
}
