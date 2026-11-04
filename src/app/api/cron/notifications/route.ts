import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/server/cron";
import { retryNotifications } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

/** Retries failed notifications. */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;
  return NextResponse.json(await retryNotifications());
}
