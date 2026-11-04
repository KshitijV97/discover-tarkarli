import { NextResponse, type NextRequest } from "next/server";
import { createBookingSchema } from "@/lib/booking/schemas";
import { createBooking } from "@/lib/server/bookings";
import { errorResponse } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";

/** POST /api/bookings → { reference, manageUrl }. All pricing is recomputed server-side. */
export async function POST(req: NextRequest) {
  try {
    const input = createBookingSchema.parse(await req.json());
    const user = await getSessionUser();
    const { reference, accessToken, paymentRequired } = await createBooking({ ...input, userId: user?.id ?? null });
    return NextResponse.json({ reference, paymentRequired, manageUrl: `/booking/${accessToken}` }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
