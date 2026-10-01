"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCopy } from "@/components/admin-locale";

type Upload = {
  id: string;
  name: string;
  progress: number;
  error: string;
  file?: File;
};

export function PhotoUploader({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const copy = useAdminCopy();
  const [uploads, setUploads] = useState<Upload[]>([]);

  function send(file: File, id: string) {
    const body = new FormData();
    body.set("hotelId", hotelId);
    body.set("photo", file);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/hotel-photos");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setUploads((current) =>
        current.map((item) => (item.id === id ? { ...item, progress } : item)),
      );
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        setUploads((current) => current.filter((item) => item.id !== id));
        router.refresh();
        return;
      }
      let error = copy.photoError;
      try {
        const payload = JSON.parse(request.responseText) as { error?: string };
        if (payload.error) error = payload.error;
      } catch {
        error = copy.photoError;
      }
      setUploads((current) =>
        current.map((item) =>
          item.id === id ? { ...item, error, file } : item,
        ),
      );
    };
    request.onerror = () => {
      setUploads((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, error: copy.photoError, file }
            : item,
        ),
      );
    };
    request.send(body);
  }

  function queue(files: FileList | File[]) {
    for (const file of files) {
      const id = crypto.randomUUID();
      setUploads((current) => [
        ...current,
        { id, name: file.name, progress: 0, error: "", file },
      ]);
      send(file, id);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#c5ced8] bg-[#fbf9f5] px-4 py-6 text-center text-sm">
        <span className="font-semibold text-[#0e4d8c]">{copy.addPhotos}</span>
        <span className="mt-1 text-xs text-[#5c6470]">{copy.dropFiles}</span>
        <span className="mt-2 text-xs text-[#5c6470]">{copy.photoRule}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) queue(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {uploads.map((upload) => (
        <div key={upload.id} className="rounded-lg border border-[#dfe5ec] px-3 py-2 text-sm">
          <p className="font-medium">{upload.name}</p>
          {upload.error ? (
            <div className="mt-1">
              <p className="text-xs text-[#9b1c1c]">{upload.error}</p>
              {upload.file && (
                <button
                  type="button"
                  onClick={() => {
                    setUploads((current) =>
                      current.map((item) =>
                        item.id === upload.id
                          ? { ...item, error: "", progress: 0 }
                          : item,
                      ),
                    );
                    send(upload.file as File, upload.id);
                  }}
                  className="mt-1 text-xs font-semibold text-[#0e4d8c]"
                >
                  {copy.retryPhoto}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-1 font-plex text-xs text-[#5c6470]">{upload.progress}%</p>
          )}
        </div>
      ))}
    </div>
  );
}
