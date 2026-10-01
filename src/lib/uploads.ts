import { del, put } from "@vercel/blob";

const extensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function selectedImages(formData: FormData, field = "photos") {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

export async function saveImage(file: File, folder: string) {
  const extension = extensions.get(file.type);
  if (!extension) throw new Error("PHOTO_TYPE");
  if (file.size > 5 * 1024 * 1024) throw new Error("PHOTO_TOO_LARGE");

  const blob = await put(
    `${folder}/${crypto.randomUUID()}.${extension}`,
    file,
    {
      access: "public",
      contentType: file.type,
    },
  );
  return blob.url;
}

export async function removeImages(urls: string[]) {
  const stored = urls.filter((url) =>
    url.includes(".blob.vercel-storage.com"),
  );
  if (stored.length === 0) return;
  await del(stored);
}
