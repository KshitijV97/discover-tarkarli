// Build entrypoint on Vercel (`vercel-build` script).
// Production deploys apply pending migrations before building, so schema
// changes ship with the code that needs them. Preview deploys skip this, so a
// preview never touches the production database.
//
// Optional: DB_SEED_ON_BUILD=true also runs the (idempotent) seed.
// Other hosts: run `npm run db:migrate` before `npm start` in your pipeline.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const isProd = process.env.VERCEL_ENV === "production" || process.env.RUN_MIGRATIONS === "true";

if (isProd) {
  console.log("▶ Applying database migrations");
  run("node scripts/migrate.mjs");
  if (process.env.DB_SEED_ON_BUILD === "true") {
    console.log("▶ Seeding database");
    run("node scripts/seed.mjs");
  }
} else {
  console.log(`▶ Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
}

run("next build");
