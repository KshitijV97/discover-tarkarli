// Points git at .githooks/ so the pre-push gate runs. Runs from `npm install` (the
// "prepare" script). Does nothing outside a git checkout or in CI/Vercel builds.
import { execSync } from "node:child_process";
import fs from "node:fs";

if (process.env.CI || process.env.VERCEL || !fs.existsSync(".git")) process.exit(0);
try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  console.log("git hooks: pre-push gate enabled (.githooks/pre-push)");
} catch {
  // git missing or not writable: skip quietly, CI still checks every push.
}
