import mongoose, { Schema, type Model } from "mongoose";

export interface PhotoCoordinates {
  lat: number;
  lng: number;
}

export interface PhotoRecord {
  eventId: mongoose.Types.ObjectId;
  cloudinaryPublicId: string;
  takenAt: Date;
  gps: PhotoCoordinates | null;
  locationName: string;
  createdAt: Date;
}

const photoSchema = new Schema<PhotoRecord>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
    },
    takenAt: {
      type: Date,
      required: true,
      index: true,
    },
    gps: {
      type: {
        lat: {
          type: Number,
          required: true,
        },
        lng: {
          type: Number,
          required: true,
        },
      },
      default: null,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
      default: "Unknown location",
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

const Photo =
  (mongoose.models.Photo as Model<PhotoRecord> | undefined) ??
  mongoose.model<PhotoRecord>("Photo", photoSchema);

export default Photo;