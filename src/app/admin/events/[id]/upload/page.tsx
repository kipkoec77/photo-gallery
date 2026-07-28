"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type EventRecord = {
  _id: string;
  title: string;
  date: string;
};

type ApiEventResponse = {
  event?: EventRecord;
  error?: string;
};

type UploadedPhotoRecord = {
  fileName: string;
  photo: {
    _id: string;
  };
};

type UploadFailureRecord = {
  fileName: string;
  error: string;
};

type UploadResponse = {
  photos?: UploadedPhotoRecord[];
  failedFiles?: UploadFailureRecord[];
  error?: string;
};

type SelectedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

function normalizeEventId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

function buildSelectedFile(file: File): SelectedFile {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function getErrorMessage(payload: UploadResponse | null, fallback: string): string {
  return payload?.error ?? fallback;
}

export default function AdminEventUploadPage() {
  const params = useParams<{ id: string | string[] }>();
  const eventId = normalizeEventId(params.id);

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<UploadFailureRecord[]>([]);

  const fileInputAccept = useMemo(
    () => "image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic",
    []
  );

  const loadEvent = useCallback(async () => {
    setLoadingEvent(true);
    setEventError(null);

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiEventResponse | null;
        throw new Error(payload?.error ?? "Failed to load event.");
      }

      const payload = (await response.json()) as ApiEventResponse;
      setEvent(payload.event ?? null);
    } catch (loadError) {
      setEventError(loadError instanceof Error ? loadError.message : "Failed to load event.");
    } finally {
      setLoadingEvent(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvent();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvent]);

  useEffect(() => {
    return () => {
      for (const entry of selectedFiles) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    };
  }, [selectedFiles]);

  function replaceSelectedFiles(files: File[]) {
    for (const entry of selectedFiles) {
      URL.revokeObjectURL(entry.previewUrl);
    }

    setSelectedFiles(files.map(buildSelectedFile));
    setUploadMessage(null);
    setUploadError(null);
    setFailedFiles([]);
  }

  function handleFiles(files: FileList | File[]) {
    replaceSelectedFiles(Array.from(files));
  }

  function handleRemoveFile(id: string) {
    setSelectedFiles((current) => {
      const next = current.filter((entry) => entry.id !== id);
      const removed = current.find((entry) => entry.id === id);

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setUploadError("Select at least one image file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);
    setFailedFiles([]);

    try {
      const formData = new FormData();
      formData.set("eventId", eventId);

      for (const entry of selectedFiles) {
        formData.append("files", entry.file, entry.file.name);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadResponse | null;
      const uploadedPhotos = payload?.photos ?? [];
      const failed = payload?.failedFiles ?? [];

      setFailedFiles(failed);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Failed to upload photos."));
      }

      setUploadMessage(`${uploadedPhotos.length} photo${uploadedPhotos.length === 1 ? "" : "s"} uploaded`);
      setSelectedFiles([]);
    } catch (submitError) {
      setUploadError(submitError instanceof Error ? submitError.message : "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  }

  const isInitialLoading = loadingEvent && event === null;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100 sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Upload photos
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">
              {isInitialLoading
                ? "Loading event context..."
                : event
                  ? `Uploading photos for: ${event.title}`
                  : "Event details are unavailable."}
            </p>
            {event ? <p className="text-sm text-zinc-400">Date: {formatDate(event.date)}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/events"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              Back to events
            </a>
            <a
              href={`/admin/events/${eventId}/albums`}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              Manage albums
            </a>
          </div>
        </header>

        {eventError ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {eventError}
          </div>
        ) : null}

        {uploadError ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {uploadError}
          </div>
        ) : null}

        {uploadMessage ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{uploadMessage}</span>
              <div className="flex flex-wrap gap-3">
                <a href={`/admin/events/${eventId}`} className="font-medium text-emerald-200 transition hover:text-white">
                  View event
                </a>
                <a href={`/admin/events/${eventId}/albums`} className="font-medium text-emerald-200 transition hover:text-white">
                  View gallery links
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl shadow-black/25">
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${
                dragActive ? "border-emerald-400 bg-emerald-400/10" : "border-white/15 bg-white/5 hover:border-emerald-400/40 hover:bg-white/[0.04]"
              }`}
              onDragEnter={(dragEvent) => {
                dragEvent.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault();
                setDragActive(false);
                handleFiles(dropEvent.dataTransfer.files);
              }}
            >
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">Drop photos here</p>
                <p className="text-sm text-zinc-400">or click to browse JPG, PNG, and HEIC files</p>
              </div>
              <input
                type="file"
                multiple
                accept={fileInputAccept}
                className="hidden"
                onChange={(inputEvent) => {
                  if (inputEvent.target.files) {
                    handleFiles(inputEvent.target.files);
                  }
                  inputEvent.currentTarget.value = "";
                }}
              />
            </label>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
              <span>{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected</span>
              <span>{uploading ? `Uploading ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}...` : "Ready to upload"}</span>
            </div>

            {selectedFiles.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedFiles.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-950/70">
                      <Image
                        src={entry.previewUrl}
                        alt={entry.file.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="truncate text-sm font-medium text-white">{entry.file.name}</p>
                      <p className="text-xs text-zinc-400">{Math.max(1, Math.round(entry.file.size / 1024))} KB</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(entry.id)}
                        className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {failedFiles.length > 0 ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                <p className="font-medium">Some files failed</p>
                <ul className="mt-3 space-y-2">
                  {failedFiles.map((failedFile) => (
                    <li key={`${failedFile.fileName}-${failedFile.error}`}>
                      <span className="font-medium">{failedFile.fileName}</span>: {failedFile.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <a
                href={`/admin/events/${eventId}`}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={uploading || selectedFiles.length === 0 || !event}
                className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {uploading ? "Uploading..." : "Upload photos"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}