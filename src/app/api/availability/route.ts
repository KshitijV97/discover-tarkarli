import { NextResponse, type NextRequest } from "next/server";
import { getAvailableRoomIds } from "@/lib/server/rooms-repo";
import { getSettings } from "@/lib/server/settings-repo";
import { validateStay } from "@/lib/booking/rules";
import { errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD → { availableRoomIds } */
export async function GET(req: NextRequest) {
  try {
    const checkIn = req.nextUrl.searchParams.get("checkIn") ?? "";
    const checkOut = req.nextUrl.searchParams.get("checkOut") ?? "";
    const error = validateStay(checkIn, checkOut, await getSettings());
    if (error) return NextResponse.json({ error }, { status: 422 });
    const availableRoomIds = await getAvailableRoomIds(checkIn, checkOut);
    return NextResponse.json({ availableRoomIds }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
