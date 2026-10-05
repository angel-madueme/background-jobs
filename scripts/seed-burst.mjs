const endpoint = process.env.WAITLIST_URL ?? "http://localhost:3000/api/waitlist";
const prefix = process.argv[2] ?? "burst-test";
const emails = Array.from({ length: 50 }, (_, index) => `${prefix}-${index + 1}@example.com`);

const results = await Promise.all(emails.map(async (email) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return { email, status: response.status, body: await response.json() };
}));

console.table(results.map(({ email, status, body }) => ({ email, status, jobId: body.id, jobStatus: body.status })));
