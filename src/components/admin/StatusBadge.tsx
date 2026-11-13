const STATUS: Record<string, string> = {
  pending: "bg-warning/15 text-warning", confirmed: "bg-success/15 text-success", checked_in: "bg-primary-soft text-primary",
  checked_out: "bg-surface-muted text-muted", cancelled: "bg-danger/10 text-danger", expired: "bg-danger/10 text-danger",
  sent: "bg-success/15 text-success", queued: "bg-warning/15 text-warning", failed: "bg-danger/10 text-danger", skipped: "bg-surface-muted text-muted",
  paid: "bg-success/15 text-success", created: "bg-surface-muted text-muted", conflict: "bg-danger/10 text-danger", refunded: "bg-surface-muted text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-semibold ${STATUS[status] ?? "bg-surface-muted text-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
