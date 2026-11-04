// Minimal, host-agnostic migration runner: applies db/migrations/*.sql in
// filename order, each in a transaction, tracked in schema_migrations.
// Works against any Postgres reachable via DATABASE_URL.
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const dir = path.resolve("db/migrations");

try {
  await sql`create table if not exists schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = fs.readFileSync(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }
  console.log("migrations up to date");
} finally {
  await sql.end();
}
