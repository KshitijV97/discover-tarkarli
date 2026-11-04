/** Role resolution (pure). Staff/admin come only from env allow-lists. */
export type UserRole = "guest" | "staff" | "admin";

const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export function roleForEmail(email: string | null | undefined, env: Record<string, string | undefined> = process.env): UserRole {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return "guest";
  if (list(env.ADMIN_EMAILS).includes(e)) return "admin";
  if (list(env.STAFF_EMAILS).includes(e)) return "staff";
  return "guest";
}

export const isStaff = (role: UserRole | undefined) => role === "staff" || role === "admin";

/** Only allow same-site relative redirects after sign-in. */
export function safeCallbackUrl(url: string | null | undefined, fallback = "/account"): string {
  return url && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : fallback;
}
