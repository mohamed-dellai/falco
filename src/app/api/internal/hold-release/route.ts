import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { holdReleaseStatus, runHoldReleaseJob } from "@/lib/hold-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.JOB_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (expected.length < 16 || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const status = await holdReleaseStatus();
  return NextResponse.json({ ok: true, ...status });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await runHoldReleaseJob();
  return NextResponse.json(
    { ok: !result.error, ...result },
    { status: result.error ? 500 : 200 },
  );
}
