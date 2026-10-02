import { NextResponse } from "next/server";
import { cancelPendingBooking, confirmBookingPayment } from "@/lib/bookings";
import { stripeWebhookEvent } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event;
  try {
    event = stripeWebhookEvent(await request.text(), signature);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    if (bookingId && session.payment_status === "paid") {
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;
      await confirmBookingPayment(bookingId, paymentIntent);
    }
  }

  if (event.type === "checkout.session.expired") {
    const bookingId = event.data.object.metadata?.bookingId;
    if (bookingId) await cancelPendingBooking(bookingId);
  }

  return NextResponse.json({ ok: true });
}
