import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { countNewSubmissions } from "@/lib/submissions";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ newRequests: 0 }, { status: 401 });
  }
  return NextResponse.json({ newRequests: await countNewSubmissions() });
}
