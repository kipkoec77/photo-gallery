import mongoose, { Schema, type Model } from "mongoose";

export interface ClientRecord {
  name: string;
  email: string;
  createdAt: Date;
}

const clientSchema = new Schema<ClientRecord>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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

clientSchema.index({ email: 1 }, { unique: true });

const Client =
  (mongoose.models.Client as Model<ClientRecord> | undefined) ??
  mongoose.model<ClientRecord>("Client", clientSchema);

export default Client;