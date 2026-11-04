import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BookingError } from "./bookings";

/** Uniform JSON error responses for API routes. */
export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request", details: err.issues.map((i) => i.message) }, { status: 400 });
  }
  if (err instanceof BookingError) {
    if (err.code === "PROVIDER") console.error(err.cause ?? err);
    const status = { INVALID: 422, UNAVAILABLE: 409, NOT_FOUND: 404, LOCKED: 423, PROVIDER: 502 }[err.code];
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
