import { NextResponse } from "next/server";
import { bookingRequestSchema, createBooking } from "@/lib/bookings";
import { allowSubmission } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "invalid" }, { status: 422 });
  }
  if (!allowSubmission(`booking:${parsed.data.email}`)) {
    return NextResponse.json(
      { ok: false, code: "unavailable" },
      { status: 429 },
    );
  }

  const result = await createBooking(parsed.data);
  if (!result.ok) {
    const status = result.error === "payment" ? 503 : 409;
    return NextResponse.json({ ok: false, code: result.error }, { status });
  }
  return NextResponse.json({
    ok: true,
    url: result.url,
    reference: result.number,
  });
}
