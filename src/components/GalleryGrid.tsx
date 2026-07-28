"use client";

import { useMemo, useState } from "react";
import { CldImage } from "next-cloudinary";

import type { GalleryPhoto } from "../lib/groupPhotos";

type GalleryGridProps = {
  photos: GalleryPhoto[];
};

export function GalleryGrid({ photos }: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Record<string, boolean>>({});
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});

  const selectedPhotoIsBroken = selectedPhoto ? Boolean(brokenPhotoIds[selectedPhoto._id]) : false;

  const selectedPhotoIsLoaded = selectedPhoto ? Boolean(loadedPhotoIds[selectedPhoto._id]) : false;

  const visiblePhotos = useMemo(() => photos, [photos]);

  function markLoaded(photoId: string) {
    setLoadedPhotoIds((current) => ({ ...current, [photoId]: true }));
  }

  function markBroken(photoId: string) {
    setBrokenPhotoIds((current) => ({ ...current, [photoId]: true }));
  }

  function renderPhotoTile(photo: GalleryPhoto) {
    const isLoaded = Boolean(loadedPhotoIds[photo._id]);
    const isBroken = Boolean(brokenPhotoIds[photo._id]);

    return (
      <button
        key={photo._id}
        type="button"
        onClick={() => setSelectedPhoto(photo)}
        className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-emerald-400/40"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
          {!isLoaded && !isBroken ? (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800" />
          ) : null}

          {isBroken ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 px-4 text-center text-zinc-300">
              <span className="text-sm font-medium text-white">Image unavailable</span>
              <span className="text-xs text-zinc-400">Tap to review details</span>
            </div>
          ) : (
            <CldImage
              src={photo.cloudinaryPublicId}
              alt={photo.locationName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              crop="fill"
              gravity="auto"
              className={`object-cover transition duration-300 group-hover:scale-105 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => markLoaded(photo._id)}
              onError={() => markBroken(photo._id)}
            />
          )}
        </div>
        <div className="space-y-1 px-4 py-3">
          <p className="line-clamp-1 text-sm font-medium text-zinc-100">
            {photo.locationName}
          </p>
          <p className="text-xs text-zinc-400">
            {new Date(photo.takenAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visiblePhotos.map(renderPhotoTile)}
      </div>

      {selectedPhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-sm text-white transition hover:bg-black/60"
            >
              Close
            </button>
            <div className="relative aspect-[16/10] bg-black">
              {selectedPhotoIsBroken ? (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 px-6 text-center text-zinc-300">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">Preview unavailable</p>
                    <p className="text-sm text-zinc-400">
                      The full-size image could not be loaded. You can still continue browsing the gallery.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {!selectedPhotoIsLoaded ? (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800" />
                  ) : null}
                  <CldImage
                    src={selectedPhoto.cloudinaryPublicId}
                    alt={selectedPhoto.locationName}
                    fill
                    sizes="100vw"
                    crop="fill"
                    gravity="auto"
                    className={`object-contain ${selectedPhotoIsLoaded ? "opacity-100" : "opacity-0"}`}
                    quality="auto"
                    onLoad={() => markLoaded(selectedPhoto._id)}
                    onError={() => markBroken(selectedPhoto._id)}
                  />
                </>
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-4 text-sm text-zinc-300">
              {selectedPhoto.locationName}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}