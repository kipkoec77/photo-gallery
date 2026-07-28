import mongoose, { Schema, type Model } from "mongoose";

export interface AdminRecord {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const adminSchema = new Schema<AdminRecord>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
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

const Admin =
  (mongoose.models.Admin as Model<AdminRecord> | undefined) ??
  mongoose.model<AdminRecord>("Admin", adminSchema);

export default Admin;