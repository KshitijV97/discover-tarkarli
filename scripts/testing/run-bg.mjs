// Starts the integration suite detached, so you keep working.
// Results: reports/integration.json; log: reports/integration.log; check with `npm run test:status`.
import { spawn } from "node:child_process";
import fs from "node:fs";

fs.mkdirSync("reports", { recursive: true });
const statusFile = "reports/integration.status.json";
try {
  const prev = JSON.parse(fs.readFileSync(statusFile, "utf8"));
  if (prev.state === "running" && isAlive(prev.pid)) {
    console.log(`integration tests already running (pid ${prev.pid}, started ${prev.startedAt})`);
    process.exit(0);
  }
} catch {}

const log = fs.openSync("reports/integration.log", "w");
const child = spawn(process.execPath, [
  "scripts/testing/run-suite.mjs", "integration",
], { detached: true, stdio: ["ignore", log, log] });
child.unref();
fs.writeFileSync(statusFile, JSON.stringify({ state: "running", pid: child.pid, startedAt: new Date().toISOString() }));
console.log(`integration tests started in the background (pid ${child.pid}). Check: npm run test:status`);

function isAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
