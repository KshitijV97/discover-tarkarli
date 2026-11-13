// Feature matrix: the feature catalog shown as test results.
// Joins docs/testing/feature-catalog.md, the manual plan's case IDs, vitest JSON
// reports (reports/unit.json, reports/integration.json) and, if present,
// docs/testing/manual-results.csv. Writes reports/feature-matrix.md.
//   npm run test:matrix            (runs unit tests first, reuses the last integration run)
//   node scripts/testing/matrix.mjs --summary   (also appends to $GITHUB_STEP_SUMMARY in CI)
import fs from "node:fs";

const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const readJson = (f) => { const s = read(f); return s ? JSON.parse(s) : null; };
const featureOf = (tc) => "F-" + tc.split("-")[1];

// 1. Catalog rows: | F-XXX | Feature | Status | ...
const features = [];
for (const line of (read("docs/testing/feature-catalog.md") ?? "").split("\n")) {
  const m = line.match(/^\|\s*(F-[A-Z0-9]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
  if (m) features.push({ id: m[1], name: m[2], status: m[3] });
}

// 2. Manual plan cases: | TC-XXX-NN | ...
const cases = new Map(); // featureId -> Set(caseId)
for (const line of (read("docs/testing/manual-test-plan.md") ?? "").split("\n")) {
  const m = line.match(/^\|\s*(TC-[A-Z0-9]+-\d+)\s*\|/);
  if (!m) continue;
  const f = featureOf(m[1]);
  if (!cases.has(f)) cases.set(f, new Set());
  cases.get(f).add(m[1]);
}

// 3. Automated results by case ID found in test titles.
const auto = { unit: new Map(), integration: new Map() }; // level -> featureId -> {pass, fail, cases:Set}
const ranAt = {};
for (const level of ["unit", "integration"]) {
  const report = readJson(`reports/${level}.json`);
  if (!report) continue;
  ranAt[level] = new Date(report.startTime).toISOString().slice(0, 16).replace("T", " ");
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      for (const tc of a.title.match(/TC-[A-Z0-9]+-\d+/g) ?? []) {
        const f = featureOf(tc);
        const bucket = auto[level].get(f) ?? { pass: 0, fail: 0, cases: new Set() };
        if (a.status === "passed") bucket.pass++; else if (a.status === "failed") bucket.fail++;
        bucket.cases.add(tc);
        auto[level].set(f, bucket);
      }
    }
  }
}

// 4. Manual results CSV: caseId,date,tester,result,notes,build (latest result per case wins).
const manual = new Map(); // featureId -> {pass, fail}
const latest = new Map();
for (const line of (read("docs/testing/manual-results.csv") ?? "").split("\n").slice(1)) {
  const [caseId, date, , result] = line.split(",");
  if (!caseId?.startsWith("TC-")) continue;
  const prev = latest.get(caseId);
  if (!prev || date >= prev.date) latest.set(caseId, { date, result: (result ?? "").trim().toLowerCase() });
}
for (const [caseId, r] of latest) {
  const f = featureOf(caseId);
  const m = manual.get(f) ?? { pass: 0, fail: 0 };
  if (r.result === "pass") m.pass++; else if (r.result === "fail") m.fail++;
  manual.set(f, m);
}

// 5. Build the table.
const cell = (b) => (b ? `${b.pass}/${b.pass + b.fail}` : "–");
let catalogCases = 0, automatedCases = 0, passingTests = 0, totalTests = 0;
const rows = features.map((f) => {
  // Features listed as "F-AUTH / F-ACC" in the plan share cases; match on the catalog ID.
  const c = cases.get(f.id) ?? new Set();
  const u = auto.unit.get(f.id), i = auto.integration.get(f.id), m = manual.get(f.id);
  const automated = new Set([...(u?.cases ?? []), ...(i?.cases ?? [])]);
  const covered = [...automated].filter((x) => c.has(x)).length;
  if (!/planned/i.test(f.status)) { catalogCases += c.size; automatedCases += covered; }
  for (const b of [u, i]) if (b) { passingTests += b.pass; totalTests += b.pass + b.fail; }
  const fails = (u?.fail ?? 0) + (i?.fail ?? 0) + (m?.fail ?? 0);
  const anyResult = u || i || m;
  const health = /planned/i.test(f.status) ? "⬜ planned"
    : fails ? "❌ failing"
    : !anyResult ? "⚠️ no results"
    : covered < c.size ? "✅ passing (partial automation)" : "✅ passing";
  return `| ${f.id} ${f.name} | ${f.status} | ${c.size} | ${covered} | ${cell(u)} | ${cell(i)} | ${cell(m)} | ${health} |`;
});

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const out = [
  "# Feature matrix",
  "",
  `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · unit run: ${ranAt.unit ?? "none"} · integration run: ${ranAt.integration ?? "none"}`,
  "",
  `**${pct(automatedCases, catalogCases)}%** of the ${catalogCases} manual-plan cases for built features have an automated test · **${pct(passingTests, totalTests)}%** of ${totalTests} ID-tagged automated tests pass`,
  "",
  "| Feature | Status | Cases | Automated | Unit | Integration | Manual | Health |",
  "|---|---|---|---|---|---|---|---|",
  ...rows,
  "",
  "Unit / Integration / Manual show passing/total tests that carry a `TC-` ID for that feature. Manual results come from `docs/testing/manual-results.csv`.",
  "",
].join("\n");

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/feature-matrix.md", out);
if (process.argv.includes("--summary") && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
console.log(out);
