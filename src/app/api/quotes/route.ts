import { NextResponse } from "next/server";
import {
  createSubmissionReference,
  quoteSchema,
  validateSubmissionTiming,
} from "@/lib/forms";
import { deliverSubmission } from "@/lib/email";
import { allowSubmission } from "@/lib/rate-limit";
import { recordQuote } from "@/lib/submissions";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = quoteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (
    parsed.data.websiteField ||
    !validateSubmissionTiming(parsed.data.startedAt)
  ) {
    return NextResponse.json(
      { ok: false, code: "SPAM_REJECTED" },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!allowSubmission(`quote:${ip}`)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const reference = createSubmissionReference("FQ");

  try {
    await recordQuote(parsed.data, reference);
  } catch (error) {
    console.error("Quote save failed", error);
    return NextResponse.json(
      { ok: false, code: "DELIVERY_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    await deliverSubmission("quote", parsed.data, reference);
  } catch (error) {
    console.error("Quote email failed", error);
  }

  return NextResponse.json({ ok: true, reference }, { status: 202 });
}
