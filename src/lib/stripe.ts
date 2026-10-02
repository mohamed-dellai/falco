import Stripe from "stripe";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

let stripe: Stripe | null = null;

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  stripe ??= new Stripe(key);
  return stripe;
}

export async function createCheckoutSession(input: {
  bookingId: string;
  locale: Locale;
  email: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  name: string;
  unitAmount: number;
  quantity: number;
}) {
  const session = await client().checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${siteConfig.url}/${input.locale}/book/complete?booking=${input.bookingId}`,
    cancel_url: `${siteConfig.url}/${input.locale}/book?room=${input.roomId}&checkIn=${input.checkIn}&checkOut=${input.checkOut}&payment=cancelled`,
    metadata: { bookingId: input.bookingId },
    line_items: [
      {
        quantity: input.quantity,
        price_data: {
          currency: "sar",
          unit_amount: input.unitAmount,
          product_data: { name: input.name },
        },
      },
    ],
  });
  if (!session.url) throw new Error("STRIPE_URL_MISSING");
  return session;
}

export function stripeWebhookEvent(body: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_NOT_CONFIGURED");
  return client().webhooks.constructEvent(body, signature, secret);
}
