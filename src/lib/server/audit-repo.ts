import "server-only";
import type { TransactionSql } from "postgres";
import { db } from "./db";

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: Date;
}

type Runner = ReturnType<typeof db> | TransactionSql<{}>;

/** Writes one audit row. Pass the transaction when the change itself runs in one. */
export async function writeAudit(
  e: { actorEmail: string; action: string; entity: string; entityId?: string | null; detail?: Record<string, unknown> },
  sql: Runner = db(),
): Promise<void> {
  await sql`insert into admin_audit_log (actor_email, action, entity, entity_id, detail)
            values (${e.actorEmail}, ${e.action}, ${e.entity}, ${e.entityId ?? null}, ${sql.json((e.detail ?? {}) as never)})`;
}

export async function listAudit(filter: { entity?: string; entityId?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const sql = db();
  const rows = await sql<{ id: string; actor_email: string; action: string; entity: string; entity_id: string | null; detail: Record<string, unknown>; created_at: Date }[]>`
    select id, actor_email, action, entity, entity_id, detail, created_at from admin_audit_log
    where (${filter.entity ?? null}::text is null or entity = ${filter.entity ?? null})
      and (${filter.entityId ?? null}::text is null or entity_id = ${filter.entityId ?? null})
    order by created_at desc limit ${filter.limit ?? 50}`;
  return rows.map((r) => ({ id: r.id, actorEmail: r.actor_email, action: r.action, entity: r.entity, entityId: r.entity_id, detail: r.detail, createdAt: r.created_at }));
}
