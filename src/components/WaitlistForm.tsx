"use client";

import { FormEvent, useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage("success"); setEmail("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); } finally { setBusy(false); }
  }

  if (message === "success") return <div className="mt-6 rounded-md bg-emerald-50 p-4 text-emerald-800">✓ You&apos;re on the waitlist.</div>;
  return <form onSubmit={submit} className="mt-6 space-y-3"><label htmlFor="email" className="block text-sm font-medium">Email address</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="you@example.com" /><button disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Joining…" : "Join Waitlist"}</button>{message && <p className="text-sm text-red-700">{message}</p>}<a className="block text-sm text-blue-700 underline" href="/jobs">View jobs</a></form>;
}
