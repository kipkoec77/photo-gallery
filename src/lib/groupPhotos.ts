import { format } from "date-fns";

export type GalleryPhoto = {
  _id: string;
  cloudinaryPublicId: string;
  takenAt: string | Date;
  gps: { lat: number; lng: number } | null;
  locationName: string;
};

export type GroupedPhotos = Array<{
  dateKey: string;
  photos: GalleryPhoto[];
}>;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function sortByTakenAtAscending(left: GalleryPhoto, right: GalleryPhoto): number {
  return toDate(left.takenAt).getTime() - toDate(right.takenAt).getTime();
}

export function groupPhotosByDate(photos: GalleryPhoto[]): GroupedPhotos {
  const grouped = new Map<string, GalleryPhoto[]>();

  for (const photo of photos) {
    const dateKey = format(toDate(photo.takenAt), "MMMM d, yyyy");
    const existing = grouped.get(dateKey) ?? [];
    existing.push(photo);
    grouped.set(dateKey, existing);
  }

  return Array.from(grouped.entries())
    .sort(
      ([leftKey, leftPhotos], [rightKey, rightPhotos]) =>
        toDate(leftPhotos[0]?.takenAt ?? leftKey).getTime() -
        toDate(rightPhotos[0]?.takenAt ?? rightKey).getTime()
    )
    .map(([dateKey, photosForDate]) => ({
      dateKey,
      photos: photosForDate.slice().sort(sortByTakenAtAscending),
    }));
}

export function getUniqueLocationNames(photos: GalleryPhoto[]): string[] {
  const names = new Set<string>();

  for (const photo of photos) {
    const locationName = photo.locationName.trim();
    if (locationName) {
      names.add(locationName);
    }
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}