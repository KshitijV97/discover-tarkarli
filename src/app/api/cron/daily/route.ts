import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/server/cron";
import { runDailyJobs } from "@/lib/server/daily-jobs";

export const dynamic = "force-dynamic";

/** Daily jobs: expire holds, balance reminders, kitchen summary, retry notifications. */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;
  return NextResponse.json(await runDailyJobs());
}
