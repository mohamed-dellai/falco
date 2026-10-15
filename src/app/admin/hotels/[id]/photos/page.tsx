import { notFound } from "next/navigation";
import { deleteHotelPhotoAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminPanel } from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import { PhotoUploader } from "@/components/photo-uploader";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getHotel, listHotelPhotos } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const hotel = await getHotel(id);
  if (!hotel) notFound();
  const photos = await listHotelPhotos(id);

  return (
    <AdminPanel title={copy.photos} className="max-w-3xl">
      <AdminError code={query.error} />
      <PhotoUploader hotelId={hotel.id} />
      {photos.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={fill(copy.photoAlt, { record: hotel.name, count: index + 1 })}
                className="h-24 w-full object-cover"
              />
              <div className="flex justify-center px-2 py-2">
                <NamedConfirm
                  title={copy.removePhotoTitle}
                  body={fill(copy.removePhotoBody, { record: hotel.name })}
                  confirm={copy.removePhotoConfirm}
                  pendingLabel={copy.removing}
                  cancelLabel={copy.keepPhoto}
                  action={deleteHotelPhotoAction}
                  fields={{ hotelId: hotel.id, photoId: photo.id }}
                  trigger={copy.remove}
                />
              </div>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--desk-muted)]">{copy.noPhotos}</p>
      )}
    </AdminPanel>
  );
}
