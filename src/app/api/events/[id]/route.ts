import mongoose from "mongoose";

import Event from "../../../../models/Event";
import Photo from "../../../../models/Photo";
import { connectToDatabase } from "../../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies JsonError, { status });
}

function isValidObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const candidate = new Date(value);
  return Number.isNaN(candidate.valueOf()) ? null : candidate;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return jsonError("Invalid event id.", 400);
    }

    const event = await Event.findById(id)
      .populate("clientId", "name email createdAt")
      .lean();

    if (!event) {
      return jsonError("Event not found.", 404);
    }

    return Response.json({ event });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load event.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid request body.", 400);
    }

    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return jsonError("Invalid event id.", 400);
    }

    const updates: { title?: string; date?: Date; locationName?: string | null } = {};

    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      const title = normalizeText((body as { title?: unknown }).title);
      if (!title) {
        return jsonError("Title is required when provided.", 400);
      }
      updates.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(body, "date")) {
      const date = parseDate((body as { date?: unknown }).date);
      if (!date) {
        return jsonError("Date is invalid when provided.", 400);
      }
      updates.date = date;
    }

    if (Object.prototype.hasOwnProperty.call(body, "locationName")) {
      const locationName = normalizeText((body as { locationName?: unknown }).locationName);
      if (locationName === null) {
        updates.locationName = undefined;
      } else {
        updates.locationName = locationName;
      }
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("Provide at least one field to update.", 400);
    }

    const event = await Event.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("clientId", "name email createdAt")
      .lean();

    if (!event) {
      return jsonError("Event not found.", 404);
    }

    return Response.json({ event });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update event.",
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return jsonError("Invalid event id.", 400);
    }

    const photoCount = await Photo.countDocuments({ eventId: id });
    if (photoCount > 0) {
      return jsonError(
        "This event cannot be deleted because it still has associated photos. Delete the photos and albums first.",
        409
      );
    }

    const deletedEvent = await Event.findByIdAndDelete(id).lean();
    if (!deletedEvent) {
      return jsonError("Event not found.", 404);
    }

    return Response.json({ deleted: true, event: deletedEvent });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete event.",
      500
    );
  }
}