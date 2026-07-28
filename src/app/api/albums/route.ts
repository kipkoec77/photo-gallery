import mongoose from "mongoose";

import Event from "../../../models/Event";
import Album from "../../../models/Album";
import { connectToDatabase } from "../../../lib/mongodb";
import { createAlbum } from "../../../lib/albums";

export const runtime = "nodejs";

type JsonError = {
  error: string;
  code?: string;
};

function jsonError(message: string, status: number, code?: string): Response {
  return Response.json({ error: message, code } satisfies JsonError, { status });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseExpiresInDays(value: unknown): number | undefined | null {
  if (typeof value === "undefined") {
    return undefined;
  }

  const numericValue = typeof value === "string" ? Number(value) : value;
  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    return null;
  }

  if (numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function sanitizeAlbumForResponse(
  album: {
    _id: unknown;
    eventId: unknown;
    shareToken: unknown;
    isPrivate: unknown;
    expiresAt?: unknown;
    createdAt: unknown;
    passwordHash?: unknown;
  }
) {
  return {
    _id: String(album._id),
    eventId: String(album.eventId),
    shareToken: String(album.shareToken),
    isPrivate: Boolean(album.isPrivate),
    hasPassword: typeof album.passwordHash === "string" && album.passwordHash.length > 0,
    expiresAt: album.expiresAt ?? null,
    createdAt: album.createdAt,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid request body.", 400);
    }

    const eventId = normalizeText((body as { eventId?: unknown }).eventId);
    const isPrivateValue = (body as { isPrivate?: unknown }).isPrivate;
    const password = normalizeText((body as { password?: unknown }).password);
    const expiresInDays = parseExpiresInDays(
      (body as { expiresInDays?: unknown }).expiresInDays
    );

    if (!eventId) {
      return jsonError("Missing eventId.", 400);
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return jsonError("Invalid eventId.", 400);
    }

    if (typeof isPrivateValue !== "boolean") {
      return jsonError("isPrivate must be a boolean.", 400);
    }

    if (expiresInDays === null) {
      return jsonError("expiresInDays must be a positive number when provided.", 400);
    }

    await connectToDatabase();

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return jsonError("Referenced event does not exist.", 404);
    }

    const album = await createAlbum(eventId, {
      isPrivate: isPrivateValue,
      password: password ?? undefined,
      expiresInDays,
    });

    const origin = new URL(request.url).origin;
    const shareUrl = `${origin}/gallery/${album.shareToken}`;

    return Response.json(
      {
        album: sanitizeAlbumForResponse({
          _id: album._id,
          eventId: album.eventId,
          shareToken: album.shareToken,
          isPrivate: album.isPrivate,
          passwordHash: album.passwordHash,
          expiresAt: album.expiresAt,
          createdAt: album.createdAt,
        }),
        shareUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      return jsonError("Failed to create a unique share token. Try again.", 409);
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to create album.",
      500
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    await connectToDatabase();

    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
    if (!eventId) {
      return jsonError("Missing eventId query parameter.", 400);
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return jsonError("Invalid eventId.", 400);
    }

    const albums = await Album.find({ eventId }).sort({ createdAt: -1 }).lean();

    return Response.json({
      albums: albums.map((album) => sanitizeAlbumForResponse(album)),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load albums.",
      500
    );
  }
}