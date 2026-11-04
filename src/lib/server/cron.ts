import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron endpoints are plain HTTP, callable by Vercel Cron, GitHub Actions,
 * cron-job.org or a crontab — send `Authorization: Bearer $CRON_SECRET`.
 */
export function authorizeCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
