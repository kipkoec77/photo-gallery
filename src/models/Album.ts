import mongoose, { Schema, type Model } from "mongoose";
import { nanoid } from "nanoid";

export interface AlbumRecord {
  eventId: mongoose.Types.ObjectId;
  shareToken: string;
  isPrivate: boolean;
  passwordHash?: string;
  expiresAt?: Date | null;
  createdAt: Date;
}

const albumSchema = new Schema<AlbumRecord>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => nanoid(21),
    },
    isPrivate: {
      type: Boolean,
      required: true,
      default: true,
    },
    passwordHash: {
      type: String,
      required: false,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const Album =
  (mongoose.models.Album as Model<AlbumRecord> | undefined) ??
  mongoose.model<AlbumRecord>("Album", albumSchema);

export default Album;