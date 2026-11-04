// Seeds sample rooms, menu items and default settings. Safe to re-run.
import fs from "node:fs";
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe(fs.readFileSync("db/seed.sql", "utf8"));
  console.log("seeded");
} finally {
  await sql.end();
}
