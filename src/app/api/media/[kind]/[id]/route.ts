import { getStoredPhoto } from "@/lib/inventory";

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await context.params;
  if (kind !== "hotels" && kind !== "rooms") {
    return new Response("Not found", { status: 404 });
  }

  const photo = await getStoredPhoto(kind, id);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
