import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "./users-repo";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
}

/** Current user or null. Never throws (auth misconfiguration → signed out). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const s = await auth();
    if (!s?.user?.id) return null;
    return { id: s.user.id, name: s.user.name ?? null, email: s.user.email ?? null, image: s.user.image ?? null, role: s.user.role };
  } catch (err) {
    // Let Next.js's dynamic-rendering signal through (it is thrown, not an error).
    if ((err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") throw err;
    console.error("[auth] session lookup failed", err);
    return null;
  }
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`/signin?callbackUrl=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaff(next = "/admin"): Promise<SessionUser> {
  const u = await requireUser(next);
  if (u.role !== "staff" && u.role !== "admin") redirect("/account?denied=1");
  return u;
}
