import mongoose from "mongoose";

import Client from "../../../models/Client";
import Event from "../../../models/Event";
import { connectToDatabase } from "../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies JsonError, { status });
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

function isValidObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

export async function GET(request: Request): Promise<Response> {
  try {
    await connectToDatabase();

    const searchParams = new URL(request.url).searchParams;
    const clientId = searchParams.get("clientId")?.trim();

    if (clientId && !isValidObjectId(clientId)) {
      return jsonError("Invalid clientId.", 400);
    }

    const filter = clientId ? { clientId } : {};
    const events = await Event.find(filter)
      .populate("clientId", "name email createdAt")
      .sort({ date: -1 })
      .lean();

    return Response.json({ events });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load events.",
      500
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid request body.", 400);
    }

    const title = normalizeText((body as { title?: unknown }).title);
    const date = parseDate((body as { date?: unknown }).date);
    const clientId = normalizeText((body as { clientId?: unknown }).clientId);
    const locationName = Object.prototype.hasOwnProperty.call(body, "locationName")
      ? normalizeText((body as { locationName?: unknown }).locationName)
      : undefined;

    if (!title || !date || !clientId) {
      return jsonError("Title, date, and clientId are required.", 400);
    }

    if (!isValidObjectId(clientId)) {
      return jsonError("Invalid clientId.", 400);
    }

    await connectToDatabase();

    const client = await Client.findById(clientId).lean();
    if (!client) {
      return jsonError("Referenced client does not exist.", 404);
    }

    const event = await Event.create({
      title,
      date,
      clientId,
      locationName,
    });

    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create event.",
      500
    );
  }
}