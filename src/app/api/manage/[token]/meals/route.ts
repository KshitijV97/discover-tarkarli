import { NextResponse, type NextRequest } from "next/server";
import { updateMealsSchema } from "@/lib/booking/schemas";
import { updateBookingMeals } from "@/lib/server/bookings";
import { errorResponse } from "@/lib/server/http";

/** PUT /api/manage/:token/meals — guest edits meals (cutoff enforced). */
export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { meals } = updateMealsSchema.parse(await req.json());
    const booking = await updateBookingMeals({ token: params.token }, meals);
    // TODO(step 5): notify guest + operator via lib/whatsapp.ts
    return NextResponse.json({ meals: booking.meals, quote: booking.quote });
  } catch (err) {
    return errorResponse(err);
  }
}
