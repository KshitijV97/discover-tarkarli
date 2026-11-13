// Smoke check against a running site. Plain HTTP, no browser, no database access,
// read-only, so it is safe to point at production.
//   node scripts/smoke.mjs http://localhost:3000
//   SMOKE_URL=https://example.com npm run smoke
const base = (process.argv[2] || process.env.SMOKE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("usage: node scripts/smoke.mjs <baseUrl>   (or set SMOKE_URL)");
  process.exit(2);
}

const day = (offset) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toISOString().slice(0, 10);
};

const checks = [
  ["TC-UI-01 home page loads", "/", (r) => r.status === 200],
  ["availability API returns JSON", `/api/availability?checkIn=${day(30)}&checkOut=${day(32)}`,
    async (r) => r.status === 200 && Array.isArray((await r.json()).availableRoomIds)],
  ["cron is protected without the secret", "/api/cron/daily", (r) => r.status === 401 || r.status === 503],
  ["TC-AUTH-03 /admin redirects when signed out", "/admin",
    (r) => [302, 303, 307, 308].includes(r.status) && /signin/.test(r.headers.get("location") || "")],
  ["unknown page returns 404", "/this-page-does-not-exist", (r) => r.status === 404],
];

let failed = 0;
for (const [name, path, ok] of checks) {
  let pass = false;
  let detail = "";
  try {
    const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    detail = `HTTP ${res.status}`;
    pass = await ok(res);
  } catch (err) {
    detail = err instanceof Error ? err.message : String(err);
  }
  if (!pass) failed++;
  console.log(`${pass ? "✓" : "✗"} ${name}  (${detail})`);
}
console.log(failed ? `\n${failed} of ${checks.length} smoke checks failed` : `\nall ${checks.length} smoke checks passed`);
process.exit(failed ? 1 : 0);
