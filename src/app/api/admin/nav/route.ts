import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { countWebsiteDraftSales } from "@/lib/inventory";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ newRequests: 0 }, { status: 401 });
  }
  return NextResponse.json({ newRequests: await countWebsiteDraftSales() });
}
