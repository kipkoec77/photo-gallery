"use client";

import { useMemo, useState } from "react";

import { DateGroupHeader } from "./DateGroupHeader";
import { DownloadAllButton } from "./DownloadAllButton";
import { ErrorBoundary } from "./ErrorBoundary";
import { GalleryGrid } from "./GalleryGrid";
import { LocationFilter } from "./LocationFilter";
import {
  getUniqueLocationNames,
  groupPhotosByDate,
  type GalleryPhoto,
} from "../lib/groupPhotos";

type GalleryClientProps = {
  photos: GalleryPhoto[];
  shareToken: string;
  password?: string | null;
};

export function GalleryClient({ photos, shareToken, password }: GalleryClientProps) {
  const [selectedLocation, setSelectedLocation] = useState("");

  const locations = useMemo(() => getUniqueLocationNames(photos), [photos]);

  const filteredPhotos = useMemo(
    () =>
      selectedLocation
        ? photos.filter((photo) => photo.locationName === selectedLocation)
        : photos,
    [photos, selectedLocation]
  );

  const groupedPhotos = useMemo(() => groupPhotosByDate(filteredPhotos), [filteredPhotos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl shadow-black/20 sm:flex-row sm:items-end sm:justify-between">
        <LocationFilter
          locations={locations}
          value={selectedLocation}
          onChange={setSelectedLocation}
        />
        <DownloadAllButton shareToken={shareToken} password={password} />
      </div>

      <ErrorBoundary>
        {groupedPhotos.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-zinc-900/60 px-6 py-16 text-center text-zinc-300">
            <h2 className="text-xl font-semibold text-white">No matching photos</h2>
            <p className="mt-2 text-sm text-zinc-400">
              The current filters do not match any photos.
            </p>
          </section>
        ) : (
          <div className="space-y-8">
            {groupedPhotos.map((group) => (
              <section
                key={group.dateKey}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20"
              >
                <DateGroupHeader dateKey={group.dateKey} count={group.photos.length} />
                <div className="p-4 sm:p-5">
                  <GalleryGrid photos={group.photos} />
                </div>
              </section>
            ))}
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}