import exifr from "exifr";

export interface ExtractedPhotoMetadata {
  takenAt: Date;
  gps: {
    lat: number;
    lng: number;
  } | null;
}

type RawExifDate = string | number | Date | null | undefined;

function parseExifDate(value: RawExifDate): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const candidate = new Date(value);
    return Number.isNaN(candidate.valueOf()) ? null : candidate;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(
        /^(\d{4}):(\d{2}):(\d{2})(?:[ T])?(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/,
        "$1-$2-$3T$4:$5:$6"
      );
    const candidate = new Date(normalized);

    return Number.isNaN(candidate.valueOf()) ? null : candidate;
  }

  return null;
}

function pickTakenAt(metadata: Record<string, unknown> | null): Date {
  if (!metadata) {
    return new Date();
  }

  return (
    parseExifDate(metadata.DateTimeOriginal as RawExifDate) ??
    parseExifDate(metadata.CreateDate as RawExifDate) ??
    parseExifDate(metadata.DateTimeDigitized as RawExifDate) ??
    parseExifDate(metadata.ModifyDate as RawExifDate) ??
    new Date()
  );
}

function normalizeGps(
  gpsData: { latitude: number; longitude: number } | null | undefined
): ExtractedPhotoMetadata["gps"] {
  if (
    !gpsData ||
    !Number.isFinite(gpsData.latitude) ||
    !Number.isFinite(gpsData.longitude)
  ) {
    return null;
  }

  return {
    lat: gpsData.latitude,
    lng: gpsData.longitude,
  };
}

export async function extractPhotoMetadata(
  buffer: Buffer
): Promise<ExtractedPhotoMetadata> {
  const [metadata, gpsData] = await Promise.all([
    exifr.parse(buffer, {
      exif: true,
      gps: true,
      tiff: true,
      reviveValues: true,
    }).catch(() => null),
    exifr.gps(buffer).catch(() => null),
  ]);

  return {
    takenAt: pickTakenAt(metadata && typeof metadata === "object" ? metadata : null),
    gps: normalizeGps(gpsData),
  };
}