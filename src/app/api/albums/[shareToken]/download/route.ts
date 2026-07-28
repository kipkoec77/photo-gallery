import { createRequire } from "node:module";
import { PassThrough, Readable } from "node:stream";

import Event from "../../../../../models/Event";
import Photo from "../../../../../models/Photo";
import {
  AlbumExpiredError,
  AlbumInvalidPasswordError,
  AlbumPasswordRequiredError,
  resolveAlbumAccess,
} from "../../../../../lib/albums";
import { connectToDatabase } from "../../../../../lib/mongodb";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as (format: string, options?: { zlib?: { level?: number } }) => {
  pipe: (destination: PassThrough) => unknown;
  append: (source: Readable, options: { name: string }) => void;
  finalize: () => Promise<void>;
  destroy: (error?: Error) => void;
};

export const runtime = "nodejs";

type JsonError = {
  error: string;
  code?: string;
};

function jsonError(message: string, status: number, code?: string): Response {
  return Response.json({ error: message, code } satisfies JsonError, { status });
}

function resolvePassword(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("password")?.trim() || request.headers.get("x-album-password")?.trim() || null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "album";
}

function formatDateStamp(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getCloudinaryUrl(publicId: string): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME environment variable.");
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
}

function deriveFileName(index: number, takenAt: Date, locationName: string): string {
  const datePart = takenAt.toISOString().replace(/[:]/g, "-").split(".")[0];
  const locationPart = slugify(locationName);
  return `${String(index + 1).padStart(3, "0")}-${datePart}-${locationPart}.jpg`;
}

function getContentDispositionFilename(eventTitle: string, eventDate: Date): string {
  return `${slugify(`${eventTitle}-${formatDateStamp(eventDate)}`)}.zip`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();

    const { shareToken } = await params;
    const album = await resolveAlbumAccess(shareToken.trim(), resolvePassword(request));

    if (!album) {
      return jsonError("This link is invalid.", 404, "ALBUM_NOT_FOUND");
    }

    const event = await Event.findById(album.eventId).select("title date locationName").lean();
    if (!event) {
      return jsonError("This album points to a missing event.", 404, "EVENT_NOT_FOUND");
    }

    const photos = await Photo.find({ eventId: album.eventId })
      .sort({ takenAt: 1 })
      .lean();

    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${getContentDispositionFilename(String(event.title), new Date(event.date))}"`,
      "Cache-Control": "no-store",
    });

    void (async () => {
      try {
        for (const [index, photo] of photos.entries()) {
          const imageResponse = await fetch(getCloudinaryUrl(photo.cloudinaryPublicId));

          if (!imageResponse.ok || !imageResponse.body) {
            throw new Error(`Failed to fetch ${photo.cloudinaryPublicId}`);
          }

          const entryName = deriveFileName(
            index,
            new Date(photo.takenAt),
            photo.locationName ?? "photo"
          );

          const webBody = imageResponse.body as unknown as Parameters<typeof Readable.fromWeb>[0];
          const nodeStream = Readable.fromWeb(webBody) as Readable;

          archive.append(nodeStream, {
            name: entryName,
          });
        }

        await archive.finalize();
      } catch (error) {
        archive.destroy(error instanceof Error ? error : new Error("Failed to generate zip."));
        stream.destroy(error instanceof Error ? error : new Error("Failed to generate zip."));
      }
    })();

    return new Response(Readable.toWeb(stream) as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof AlbumExpiredError) {
      return jsonError("This link has expired.", 410, "ALBUM_EXPIRED");
    }

    if (error instanceof AlbumPasswordRequiredError) {
      return jsonError(
        "A password is required for this album.",
        401,
        "PASSWORD_REQUIRED"
      );
    }

    if (error instanceof AlbumInvalidPasswordError) {
      return jsonError("Incorrect password.", 401, "INVALID_PASSWORD");
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to generate download.",
      500
    );
  }
}