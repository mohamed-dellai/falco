import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  addHotelPhoto,
  addOfferPhoto,
} from "@/lib/inventory";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }

  const form = await request.formData();
  const hotelId = String(form.get("hotelId") ?? "");
  const roomId = String(form.get("roomId") ?? "");
  const offerId = String(form.get("offerId") ?? "");
  const file = form.get("photo");
  const ownerCount = [hotelId, roomId, offerId].filter(Boolean).length;
  if (
    ownerCount !== 1 ||
    roomId ||
    !(file instanceof File) ||
    file.size === 0
  ) {
    return NextResponse.json({ error: "photo" }, { status: 400 });
  }

  try {
    if (hotelId) {
      await addHotelPhoto(hotelId, file);
    } else if (offerId) {
      await addOfferPhoto(offerId, file);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "photo" }, { status: 400 });
  }
}
