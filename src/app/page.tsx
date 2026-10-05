import WaitlistForm from "@/components/WaitlistForm";

export default function Home() {
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6"><section className="w-full rounded-xl bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">Join the waitlist</h1><p className="mt-2 text-slate-600">Enter your email and we’ll send a confirmation in the background.</p><WaitlistForm /></section></main>;
}
