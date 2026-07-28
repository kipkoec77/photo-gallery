import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

import Album from "../models/Album";
import type { AlbumRecord } from "../models/Album";

export class AlbumExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlbumExpiredError";
  }
}

export class AlbumPasswordRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlbumPasswordRequiredError";
  }
}

export class AlbumInvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlbumInvalidPasswordError";
  }
}

type CreateAlbumOptions = {
  isPrivate: boolean;
  password?: string;
  expiresInDays?: number;
};

function normalizeOptionalPassword(password: string | undefined): string | undefined {
  if (!password) {
    return undefined;
  }

  const normalized = password.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function calculateExpiresAt(expiresInDays: number | undefined): Date | null {
  if (typeof expiresInDays !== "number") {
    return null;
  }

  if (!Number.isFinite(expiresInDays) || expiresInDays <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
}

export async function createAlbum(
  eventId: string,
  options: CreateAlbumOptions
): Promise<mongoose.HydratedDocument<AlbumRecord>> {
  const password = normalizeOptionalPassword(options.password);
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const expiresAt = calculateExpiresAt(options.expiresInDays);

  const album = await Album.create({
    eventId,
    shareToken: nanoid(21),
    isPrivate: options.isPrivate,
    passwordHash,
    expiresAt,
  });

  return album;
}

export async function getAlbumByToken(shareToken: string): Promise<mongoose.HydratedDocument<AlbumRecord> | null> {
  const album = await Album.findOne({ shareToken });

  if (!album) {
    return null;
  }

  if (album.expiresAt && album.expiresAt.getTime() < Date.now()) {
    throw new AlbumExpiredError("This album link has expired.");
  }

  return album;
}

export async function resolveAlbumAccess(
  shareToken: string,
  password?: string | null
): Promise<mongoose.HydratedDocument<AlbumRecord> | null> {
  const album = await getAlbumByToken(shareToken);

  if (!album) {
    return null;
  }

  if (album.passwordHash) {
    const normalizedPassword = typeof password === "string" ? password.trim() : "";

    if (!normalizedPassword) {
      throw new AlbumPasswordRequiredError("A password is required for this album.");
    }

    const passwordMatches = await bcrypt.compare(normalizedPassword, album.passwordHash);

    if (!passwordMatches) {
      throw new AlbumInvalidPasswordError("Incorrect password.");
    }
  }

  return album;
}