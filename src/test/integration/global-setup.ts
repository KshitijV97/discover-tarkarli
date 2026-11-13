/**
 * Integration-test database. Uses TEST_DATABASE_URL when set (CI sets it to a
 * Postgres 16 service). Otherwise starts a throwaway local Postgres 16 with
 * embedded-postgres (no Docker needed), stored in .cache/pg-test.
 *
 * Safety: this never reads DATABASE_URL, so tests can't touch the dev or
 * production database by accident, and it refuses non-local hosts unless
 * ALLOW_REMOTE_TEST_DB=1.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import postgres from "postgres";
import type { GlobalSetupContext } from "vitest/node";

const PORT = 54330;
const DIR = path.resolve(".cache/pg-test");

const portOpen = (port: number) =>
  new Promise<boolean>((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });

export default async function setup({ provide }: GlobalSetupContext) {
  let url = process.env.TEST_DATABASE_URL;
  let stop: (() => Promise<void>) | undefined;

  if (!url) {
    url = `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`;
    if (!(await portOpen(PORT))) {
      const { default: EmbeddedPostgres } = await import("embedded-postgres");
      const pg = new EmbeddedPostgres({
        databaseDir: DIR, port: PORT, user: "postgres", password: "postgres", persistent: true,
        onLog: () => {}, onError: () => {},
      });
      if (!fs.existsSync(path.join(DIR, "PG_VERSION"))) await pg.initialise();
      await pg.start();
      stop = () => pg.stop();
    }
  }

  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && process.env.ALLOW_REMOTE_TEST_DB !== "1") {
    throw new Error(`Refusing to run integration tests against non-local host "${host}". Set ALLOW_REMOTE_TEST_DB=1 if this is a throwaway database.`);
  }

  // Extensions are database-wide: create once here, not per test file (parallel files would race).
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  try { await admin`create extension if not exists btree_gist`; } finally { await admin.end(); }

  provide("testDatabaseUrl", url);
  return async () => { await stop?.(); };
}

declare module "vitest" {
  export interface ProvidedContext { testDatabaseUrl: string }
}
