import { NextResponse, type NextRequest } from "next/server";
import { getNightlyAvailability } from "@/lib/server/rooms-repo";
import { diffDays, isISODate } from "@/lib/dates";
import { errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/availability/calendar?from=&to= → free rooms per night (max 120 nights). */
export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from") ?? "";
    const to = req.nextUrl.searchParams.get("to") ?? "";
    if (!isISODate(from) || !isISODate(to) || diffDays(from, to) < 1 || diffDays(from, to) > 120) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }
    return NextResponse.json(await getNightlyAvailability(from, to), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
