/** Pure: the fields that changed between two flat settings groups, for the audit log. */
export interface FieldChange { field: string; from: unknown; to: unknown }

export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, from: before[k] ?? null, to: after[k] ?? null }));
}

/** "deposit.value: 30 → 25" style summary. */
export function describeChanges(group: string, changes: FieldChange[]): string {
  if (changes.length === 0) return `${group}: saved with no changes`;
  return changes.map((c) => `${group}.${c.field}: ${fmt(c.from)} → ${fmt(c.to)}`).join("; ");
}

const fmt = (v: unknown) => (typeof v === "string" ? (v === "" ? "(empty)" : v) : JSON.stringify(v));
