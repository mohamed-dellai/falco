import { NextResponse } from "next/server";
import {
  agencySchema,
  createSubmissionReference,
  validateSubmissionTiming,
} from "@/lib/forms";
import { deliverSubmission } from "@/lib/email";
import { allowSubmission } from "@/lib/rate-limit";
import { recordAgencyApplication } from "@/lib/submissions";

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

  const parsed = agencySchema.safeParse(payload);
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
  if (!allowSubmission(`agency:${ip}`)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const reference = createSubmissionReference("FA");

  try {
    await recordAgencyApplication(parsed.data, reference);
  } catch (error) {
    console.error("Agency application save failed", error);
    return NextResponse.json(
      { ok: false, code: "DELIVERY_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    await deliverSubmission("agency", parsed.data, reference);
  } catch (error) {
    console.error("Agency application email failed", error);
  }

  return NextResponse.json({ ok: true, reference }, { status: 202 });
}
