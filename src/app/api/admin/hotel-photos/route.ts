import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { addHotelPhoto } from "@/lib/inventory";

const photoError = "Use a JPG, PNG, or WebP photo under 5 MB.";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const form = await request.formData();
  const hotelId = String(form.get("hotelId") ?? "");
  const file = form.get("photo");
  if (!hotelId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: photoError }, { status: 400 });
  }

  try {
    await addHotelPhoto(hotelId, file);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: photoError }, { status: 400 });
  }
}
