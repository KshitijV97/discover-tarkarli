/**
 * Per-file test database: each test file gets its own schema with every
 * migration applied, so files run in parallel without seeing each other's
 * rows. The app's db() client is pointed at that schema.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __gtrSql?: Sql };

const dateAsString = { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x };

export interface TestDb { sql: Sql; schema: string }

/** Call at the top of an integration test file. Truncates app tables before each test. */
export function setupTestDb(): TestDb {
  const ctx = {} as TestDb;
  let admin: Sql;

  beforeAll(async () => {
    const url = inject("testDatabaseUrl");
    ctx.schema = `test_${crypto.randomBytes(5).toString("hex")}`;
    admin = postgres(url, { max: 1, onnotice: () => {} });
    await admin.unsafe(`create schema ${ctx.schema}`);

    ctx.sql = postgres(url, {
      max: 5, prepare: false, onnotice: () => {},
      connection: { search_path: `${ctx.schema},public` },
      types: { date: dateAsString },
    });
    const dir = path.resolve("db/migrations");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await ctx.sql.unsafe(fs.readFileSync(path.join(dir, file), "utf8"));
    }
    g.__gtrSql = ctx.sql; // the app's db() now returns this client
  });

  beforeEach(async () => {
    await ctx.sql.unsafe(`
      truncate notifications, payments, booking_meals, booking_rooms, bookings, rooms, settings restart identity cascade`);
  });

  afterAll(async () => {
    await ctx.sql?.end();
    g.__gtrSql = undefined;
    await admin?.unsafe(`drop schema if exists ${ctx.schema} cascade`);
    await admin?.end();
  });

  return ctx;
}
