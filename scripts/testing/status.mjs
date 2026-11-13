// One line per suite: when it last ran, pass/fail counts, and failing cases by feature.
//   npm run test:status
import fs from "node:fs";

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

for (const suite of ["unit", "integration"]) {
  const status = read(`reports/${suite}.status.json`);
  const report = read(`reports/${suite}.json`);
  if (!status) { console.log(`${suite.padEnd(12)} ⬜ never run here (npm run test:${suite === "unit" ? "report" : "integration:bg"})`); continue; }
  if (status.state === "running") { console.log(`${suite.padEnd(12)} ⏳ running, started ${ago(status.startedAt)}`); continue; }
  const passed = report?.numPassedTests ?? 0, failed = report?.numFailedTests ?? 0, total = report?.numTotalTests ?? 0;
  const failures = (report?.testResults ?? []).flatMap((f) => f.assertionResults.filter((a) => a.status === "failed"))
    .map((a) => a.title.match(/TC-[A-Z0-9]+-\d+/)?.[0] ?? a.title.slice(0, 40));
  const icon = status.state === "passed" ? "✅" : "❌";
  console.log(`${suite.padEnd(12)} ${icon} ${passed}/${total} passed, ${ago(status.finishedAt)}${failed ? ` · failing: ${failures.join(", ")}` : ""}`);
}
