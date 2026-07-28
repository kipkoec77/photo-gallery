import mongoose, { Schema, type Model } from "mongoose";

export interface EventRecord {
  title: string;
  date: Date;
  locationName?: string | null;
  clientId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const eventSchema = new Schema<EventRecord>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      trim: true,
      default: undefined,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
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

const Event =
  (mongoose.models.Event as Model<EventRecord> | undefined) ??
  mongoose.model<EventRecord>("Event", eventSchema);

export default Event;