"use client";

import { FormEvent, useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isSuccess = message === "success";

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); } finally { setBusy(false); }
  }

  return <><form onSubmit={submit} className="mx-auto mt-12 w-full max-w-[700px]"><div className="waitlist-field flex min-h-[74px] items-center rounded-full border border-[#ffdcd7] bg-white/95 p-2 pl-6 text-left shadow-[0_15px_35px_rgba(240,104,96,0.12)] transition hover:border-[#ffb8b0] hover:shadow-[0_18px_42px_rgba(240,104,96,0.18)] focus-within:border-[#ff9f96]"><input id="email" type="email" required disabled={isSuccess} value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-full bg-transparent pr-3 text-base text-[#101218] outline-none transition placeholder:text-[#71809f] hover:bg-[#fffaf8] focus:bg-[#fffaf8] sm:text-lg" placeholder="Enter your email" /><button type="submit" disabled={busy || isSuccess || !isValidEmail} className={`flex min-h-[58px] shrink-0 items-center justify-center gap-3 rounded-full px-5 text-sm font-semibold shadow-sm transition duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a70] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:hover:scale-100 sm:min-w-[190px] sm:px-7 sm:text-base ${isSuccess ? "bg-[#111214] text-white hover:bg-[#25262a] disabled:bg-[#111214] disabled:text-white disabled:hover:bg-[#111214]" : "bg-[#111214] text-white hover:bg-[#25262a] hover:shadow-lg disabled:bg-[#cbd1dc] disabled:text-[#71809f] disabled:hover:bg-[#cbd1dc] disabled:hover:shadow-none"}`}>{isSuccess ? <><span aria-hidden="true" className="text-2xl font-light leading-none">✓</span>Joined</> : busy ? "Joining…" : "Join Waitlist"}</button></div>{isSuccess ? <p className="mt-7 flex items-center justify-center gap-3 text-sm font-medium text-[#71809f] sm:text-base"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a9b4c9] text-sm text-white">✓</span>You&apos;re on the waitlist.</p> : message && <p className="mt-3 text-center text-sm font-medium text-[#f05252]">{message}</p>}</form><a className="fixed bottom-6 right-6 z-10 rounded-full border border-[#f1c9c2] bg-white/90 px-4 py-2 text-sm font-semibold text-[#71809f] shadow-[0_10px_25px_rgba(225,86,83,0.12)] transition hover:-translate-y-0.5 hover:border-[#ff9f96] hover:text-[#f05252] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a70] focus-visible:ring-offset-2 sm:bottom-8 sm:right-8" href="/jobs">View jobs</a></>;
}
