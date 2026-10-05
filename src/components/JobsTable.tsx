"use client";

import { useEffect, useState } from "react";

type Job = { id: string; type: string; payload: unknown; status: string; attempts: number; maxAttempts: number; lastError: string | null; runAt: string; createdAt: string };

export default function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]); const [filter, setFilter] = useState(""); const [selected, setSelected] = useState<Job | null>(null);
  const load = () => fetch(`/api/jobs${filter ? `?status=${filter}` : ""}`).then((r) => r.json()).then(setJobs);
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [filter]);
  async function retry(id: string) { await fetch(`/api/jobs/${id}/retry`, { method: "POST" }); setSelected(null); await load(); }
  return <div className="mt-8"><div className="mb-3 flex gap-2"><button onClick={() => setFilter("")} className="rounded border px-3 py-1">All</button><button onClick={() => setFilter("dead")} className="rounded border px-3 py-1">Dead letters</button></div><div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b text-slate-600"><tr><th className="p-4">ID</th><th className="p-4">Status</th><th className="p-4">Attempts</th><th className="p-4">Created</th><th className="p-4">Run at</th></tr></thead><tbody>{jobs.map((job) => <tr className="cursor-pointer border-b last:border-0 hover:bg-slate-50" key={job.id} onClick={() => setSelected(job)}><td className="p-4 font-mono">{job.id}</td><td className="p-4"><span className={`rounded-full px-2 py-1 ${job.status === "failed" ? "bg-amber-100 text-amber-800" : "bg-slate-100"}`}>{job.status}</span></td><td className="p-4">{job.attempts}/{job.maxAttempts}</td><td className="p-4">{new Date(job.createdAt).toLocaleString()}</td><td className="p-4">{new Date(job.runAt).toLocaleString()}</td></tr>)}</tbody></table>{jobs.length === 0 && <p className="p-6 text-slate-600">No jobs yet.</p>}</div>{selected && <aside className="mt-4 rounded-xl bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="font-semibold">Job {selected.id}</h2><button onClick={() => setSelected(null)}>Close</button></div><pre className="mt-3 overflow-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify(selected.payload, null, 2)}</pre>{selected.lastError && <p className="mt-3 text-sm text-red-700">{selected.lastError}</p>}{selected.status === "dead" && <button onClick={() => retry(selected.id)} className="mt-4 rounded bg-slate-900 px-3 py-2 text-white">Retry</button>}</aside>}</div>;
}
