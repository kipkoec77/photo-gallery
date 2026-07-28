import mongoose from "mongoose";

import Photo from "../../../models/Photo";
import { connectToDatabase } from "../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies JsonError, { status });
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId")?.trim();
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    const location = url.searchParams.get("location")?.trim();

    if (!eventId) {
      return jsonError("Missing eventId.", 400);
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return jsonError("Invalid eventId.", 400);
    }

    const filter: Record<string, unknown> = { eventId };

    if (from || to) {
      filter.takenAt = {};
      if (from) {
        (filter.takenAt as Record<string, Date>).$gte = from;
      }
      if (to) {
        (filter.takenAt as Record<string, Date>).$lte = to;
      }
    }

    if (location) {
      filter.locationName = location;
    }

    const photos = await Photo.find(filter)
      .select("cloudinaryPublicId takenAt gps locationName")
      .sort({ takenAt: 1 })
      .lean();

    return Response.json({ photos });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load photos.",
      500
    );
  }
}