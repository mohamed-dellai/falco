"use client";

import { ImagePlus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCopy } from "@/components/admin-locale";

type Upload = {
  id: string;
  name: string;
  progress: number;
  error: string;
  file: File;
};

type PhotoUploaderProps =
  { hotelId: string; roomId?: never } | { hotelId?: never; roomId: string };

const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumPhotoSize = 5 * 1024 * 1024;

export function PhotoUploader({ hotelId, roomId }: PhotoUploaderProps) {
  const router = useRouter();
  const copy = useAdminCopy();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);

  function send(file: File, id: string) {
    const body = new FormData();
    body.set(hotelId ? "hotelId" : "roomId", hotelId ?? roomId);
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
        const payload = JSON.parse(request.responseText) as {
          error?: "photo" | "auth";
        };
        if (payload.error === "auth") error = copy.sessionExpired;
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
          item.id === id ? { ...item, error: copy.photoError, file } : item,
        ),
      );
    };
    request.send(body);
  }

  function queue(files: FileList | File[]) {
    const queued = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      progress: 0,
      error:
        photoTypes.has(file.type) && file.size <= maximumPhotoSize
          ? ""
          : copy.photoError,
      file,
    }));
    setUploads((current) => [...current, ...queued]);
    queued
      .filter((upload) => !upload.error)
      .forEach(({ file, id }) => send(file, id));
  }

  return (
    <div className="grid gap-3">
      <label
        className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center text-sm transition focus-within:ring-2 focus-within:ring-[var(--desk-gold)] focus-within:ring-offset-2 ${
          dragging
            ? "border-[var(--desk-primary)] bg-[var(--desk-primary-soft)]"
            : "border-[var(--desk-line-strong)] bg-[var(--desk-canvas)]"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) queue(event.dataTransfer.files);
        }}
      >
        <ImagePlus
          aria-hidden="true"
          size={22}
          className="mb-2 text-[var(--desk-primary)]"
        />
        <span className="font-semibold text-[var(--desk-primary)]">
          {copy.addPhotos}
        </span>
        <span className="mt-1 text-xs text-[var(--desk-muted)]">
          {copy.dropFiles}
        </span>
        <span className="mt-2 text-xs text-[var(--desk-muted)]">
          {copy.photoRule}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            if (event.target.files?.length) queue(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <div aria-live="polite" className="grid gap-2">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="rounded-xl border border-[var(--desk-line)] bg-white px-3 py-2.5 text-sm"
          >
            <p className="truncate font-medium">{upload.name}</p>
            {upload.error ? (
              <div className="mt-1 flex items-center justify-between gap-3">
                <p role="alert" className="text-xs text-[var(--desk-danger)]">
                  {upload.error}
                </p>
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
                    send(upload.file, upload.id);
                  }}
                  className="desk-focus inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[var(--desk-primary)]"
                >
                  <RotateCcw aria-hidden="true" size={13} />
                  {copy.retryPhoto}
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <progress
                  max={100}
                  value={upload.progress}
                  aria-label={`${upload.name} ${upload.progress}%`}
                  className="h-1.5 min-w-0 flex-1 accent-[var(--desk-primary)]"
                />
                <span className="font-plex text-xs tabular-nums text-[var(--desk-muted)]">
                  {upload.progress}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
