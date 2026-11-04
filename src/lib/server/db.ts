import "server-only";
import postgres from "postgres";

/**
 * Plain Postgres client (postgres.js). Point DATABASE_URL at any Postgres —
 * Supabase, Neon, RDS, a VPS, or local Docker — with no code changes.
 * `prepare: false` keeps it compatible with transaction-mode poolers
 * (Supabase Supavisor / PgBouncer), which serverless hosts need.
 *
 * Keep DATABASE_POOL_MAX >= 3: pages run several queries concurrently, and
 * with a single connection postgres.js pipelines them, which transaction-mode
 * poolers don't handle — requests hang until the function times out.
 */
type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __gtrSql?: Sql };

function create(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
  return postgres(url, {
    max: Math.max(3, Number(process.env.DATABASE_POOL_MAX ?? 5)),
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10, // fail fast instead of hanging until the platform timeout
    onnotice: () => {},
    // Return DATE columns as "YYYY-MM-DD" strings instead of JS Dates.
    types: {
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  });
}

/** Lazily-created shared client (reused across hot reloads / warm invocations). */
export function db(): Sql {
  return (g.__gtrSql ??= create());
}
