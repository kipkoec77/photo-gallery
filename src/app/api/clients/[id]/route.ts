import mongoose from "mongoose";

import Client from "../../../../models/Client";
import Event from "../../../../models/Event";
import { connectToDatabase } from "../../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies JsonError, { status });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function isValidObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await connectToDatabase();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return jsonError("Invalid client id.", 400);
    }

    const client = await Client.findById(id).lean();
    if (!client) {
      return jsonError("Client not found.", 404);
    }

    return Response.json({ client });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load client.",
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
      return jsonError("Invalid client id.", 400);
    }

    const updates: { name?: string; email?: string } = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = normalizeName((body as { name?: unknown }).name);
      if (!name) {
        return jsonError("Name is required when provided.", 400);
      }
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const email = normalizeEmail((body as { email?: unknown }).email);
      if (!email) {
        return jsonError("Email is required when provided.", 400);
      }
      if (!isValidEmail(email)) {
        return jsonError("Email format is invalid.", 400);
      }
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("Provide at least one field to update.", 400);
    }

    try {
      const client = await Client.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).lean();

      if (!client) {
        return jsonError("Client not found.", 404);
      }

      return Response.json({ client });
    } catch (error) {
      if (
        error instanceof mongoose.mongo.MongoServerError &&
        error.code === 11000
      ) {
        return jsonError("A client with that email already exists.", 409);
      }

      if (error instanceof mongoose.Error.ValidationError) {
        return jsonError("Client validation failed.", 400);
      }

      throw error;
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update client.",
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
      return jsonError("Invalid client id.", 400);
    }

    const eventCount = await Event.countDocuments({ clientId: id });
    if (eventCount > 0) {
      return jsonError(
        "This client cannot be deleted because they still have associated events.",
        409
      );
    }

    const deletedClient = await Client.findByIdAndDelete(id).lean();
    if (!deletedClient) {
      return jsonError("Client not found.", 404);
    }

    return Response.json({ deleted: true, client: deletedClient });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete client.",
      500
    );
  }
}