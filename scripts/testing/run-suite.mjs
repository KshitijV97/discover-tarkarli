// Runs one suite and writes reports/<suite>.json (vitest JSON) and reports/<suite>.status.json.
//   node scripts/testing/run-suite.mjs unit|integration
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const suite = process.argv[2];
const config = { unit: "vitest.config.ts", integration: "vitest.integration.config.ts" }[suite];
if (!config) { console.error("usage: run-suite.mjs unit|integration"); process.exit(2); }

fs.mkdirSync("reports", { recursive: true });
const startedAt = new Date().toISOString();
const res = spawnSync(process.execPath, [
  "node_modules/vitest/vitest.mjs", "run", "-c", config,
  "--reporter=default", "--reporter=json", `--outputFile.json=reports/${suite}.json`,
], { stdio: "inherit" });
fs.writeFileSync(`reports/${suite}.status.json`, JSON.stringify({
  state: res.status === 0 ? "passed" : "failed", exitCode: res.status, startedAt, finishedAt: new Date().toISOString(),
}));
process.exit(res.status ?? 1);
