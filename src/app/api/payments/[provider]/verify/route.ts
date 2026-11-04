import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { confirmCheckout } from "@/lib/server/payments";
import { errorResponse } from "@/lib/server/http";

const schema = z.object({ orderId: z.string().min(1), paymentId: z.string().min(1), signature: z.string().min(1) });

/** POST /api/payments/:provider/verify — browser callback after checkout succeeds. */
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const body = schema.parse(await req.json());
    const { outcome } = await confirmCheckout(params.provider, body);
    return NextResponse.json({ outcome });
  } catch (err) {
    return errorResponse(err);
  }
}
