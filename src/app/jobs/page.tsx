import JobsTable from "@/components/JobsTable";

export default function JobsPage() { return <main className="mx-auto min-h-screen max-w-6xl px-6 py-12"><div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Jobs</h1><a className="text-sm text-blue-700 underline" href="/">Join waitlist</a></div><JobsTable /></main>; }
