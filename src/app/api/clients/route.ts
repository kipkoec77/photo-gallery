import mongoose from "mongoose";

import Client from "../../../models/Client";
import { connectToDatabase } from "../../../lib/mongodb";

export const runtime = "nodejs";

type JsonError = {
  error: string;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies JsonError, { status });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: Request): Promise<Response> {
  try {
    await connectToDatabase();

    const search = new URL(request.url).searchParams.get("search")?.trim();

    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegExp(search), $options: "i" } },
            { email: { $regex: escapeRegExp(search), $options: "i" } },
          ],
        }
      : {};

    const clients = await Client.find(filter).sort({ name: 1 }).lean();

    return Response.json({ clients });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load clients.",
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

    const name = normalizeName((body as { name?: unknown }).name);
    const email = normalizeEmail((body as { email?: unknown }).email);

    if (!name || !email) {
      return jsonError("Name and email are required.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError("Email format is invalid.", 400);
    }

    await connectToDatabase();

    try {
      const client = await Client.create({ name, email });
      return Response.json({ client }, { status: 201 });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        return jsonError("Client validation failed.", 400);
      }

      if (
        error instanceof mongoose.mongo.MongoServerError &&
        error.code === 11000
      ) {
        return jsonError("A client with that email already exists.", 409);
      }

      throw error;
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create client.",
      500
    );
  }
}