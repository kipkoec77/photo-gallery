import Album from "../../../../models/Album";
import Event from "../../../../models/Event";
import {
  AlbumExpiredError,
  AlbumInvalidPasswordError,
  AlbumPasswordRequiredError,
  resolveAlbumAccess,
} from "../../../../lib/albums";
import { connectToDatabase } from "../../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
  code?: string;
};

function jsonError(message: string, status: number, code?: string): Response {
  return Response.json({ error: message, code } satisfies JsonError, { status });
}

function sanitizeToken(token: string): string {
  return token.trim();
}

function resolvePassword(request: Request): string | null {
  const url = new URL(request.url);
  const queryPassword = url.searchParams.get("password")?.trim();
  const headerPassword = request.headers.get("x-album-password")?.trim();

  return queryPassword || headerPassword || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();

    const { shareToken } = await params;
    const token = sanitizeToken(shareToken);
    if (!token) {
      return jsonError("Album token is required.", 400, "ALBUM_TOKEN_REQUIRED");
    }

    const album = await resolveAlbumAccess(token, resolvePassword(request));
    if (!album) {
      return jsonError("This link is invalid.", 404, "ALBUM_NOT_FOUND");
    }

    const event = await Event.findById(album.eventId)
      .select("title date locationName")
      .lean();

    if (!event) {
      return jsonError("This album points to a missing event.", 404, "EVENT_NOT_FOUND");
    }

    return Response.json({
      album: {
        _id: String(album._id),
        shareToken: album.shareToken,
        eventId: String(album.eventId),
        isPrivate: album.isPrivate,
        expiresAt: album.expiresAt ?? null,
        createdAt: album.createdAt,
        event,
      },
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
      error instanceof Error ? error.message : "Failed to resolve album.",
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();
    const { shareToken } = await params;
    const token = sanitizeToken(shareToken);
    if (!token) {
      return jsonError("Album token is required.", 400, "ALBUM_TOKEN_REQUIRED");
    }

    const deletedAlbum = await Album.findOneAndDelete({ shareToken: token }).lean();
    if (!deletedAlbum) {
      return jsonError("Album not found.", 404, "ALBUM_NOT_FOUND");
    }

    return Response.json({
      deleted: true,
      album: {
        _id: String(deletedAlbum._id),
        shareToken: deletedAlbum.shareToken,
        eventId: String(deletedAlbum.eventId),
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to revoke album.",
      500
    );
  }
}