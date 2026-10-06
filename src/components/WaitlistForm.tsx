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
      setMessage("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="mx-auto mt-12 w-full max-w-[700px]"><div className="waitlist-field flex min-h-[74px] items-center rounded-full border border-[#ffdcd7] bg-white/95 p-2 pl-6 text-left shadow-[0_15px_35px_rgba(240,104,96,0.12)]"><input id="email" type="email" required disabled={message === "success"} value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent pr-3 text-base text-[#101218] outline-none placeholder:text-[#71809f] sm:text-lg" placeholder="Enter your email" /><button type="submit" disabled={busy || message === "success"} className="flex min-h-[58px] shrink-0 items-center justify-center gap-3 rounded-full bg-[#111214] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-100 sm:min-w-[190px] sm:px-7 sm:text-base">{message === "success" ? <><span aria-hidden="true" className="text-2xl font-light leading-none">✓</span>Joined</> : busy ? "Joining…" : "Join Waitlist"}</button></div>{message === "success" ? <p className="mt-7 flex items-center justify-center gap-3 text-sm font-medium text-[#71809f] sm:text-base"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a9b4c9] text-sm text-white">✓</span>You&apos;re on the waitlist.</p> : message && <p className="mt-3 text-center text-sm font-medium text-[#f05252]">{message}</p>}<a className="mt-8 block text-sm text-[#71809f] underline decoration-[#ffb0aa] underline-offset-4" href="/jobs">View jobs</a></form>;
}
