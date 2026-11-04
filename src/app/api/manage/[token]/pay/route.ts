import { NextResponse } from "next/server";
import { startDepositCheckout } from "@/lib/server/payments";
import { errorResponse } from "@/lib/server/http";

/** POST /api/manage/:token/pay → checkout session for the deposit. */
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  try {
    return NextResponse.json(await startDepositCheckout(params.token));
  } catch (err) {
    return errorResponse(err);
  }
}
