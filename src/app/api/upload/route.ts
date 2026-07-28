import mongoose from "mongoose";

import Photo from "../../../models/Photo";
import { connectToDatabase } from "../../../lib/mongodb";
import {
  CloudinaryConfigurationError,
  CloudinaryUploadError,
  uploadImage,
} from "../../../lib/cloudinary";
import { extractPhotoMetadata } from "../../../lib/exif";
import { reverseGeocode } from "../../../lib/geocode";

export const runtime = "nodejs";

type RouteErrorBody = {
  error: string;
};

type UploadFailure = {
  fileName: string;
  error: string;
};

type UploadSuccess = {
  fileName: string;
  photo: unknown;
};

type UploadResponseBody = {
  photos: UploadSuccess[];
  failedFiles: UploadFailure[];
};

function jsonError(message: string, status: number): Response {
  const body: RouteErrorBody = {
    error: message,
  };

  return Response.json(body, { status });
}

function isImageFile(file: File): boolean {
  return typeof file.type === "string" && file.type.startsWith("image/");
}

function collectFiles(formData: FormData): File[] {
  return formData.getAll("files").filter((entry): entry is File => entry instanceof File);
}

function createUploadResponse(body: UploadResponseBody, status: number): Response {
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return jsonError("Expected multipart/form-data.", 415);
    }

    const formData = await request.formData();
    const eventIdValue = formData.get("eventId");

    if (typeof eventIdValue !== "string" || !eventIdValue.trim()) {
      return jsonError("Missing eventId.", 400);
    }

    const eventId = eventIdValue.trim();

    if (!mongoose.isValidObjectId(eventId)) {
      return jsonError("Invalid eventId.", 400);
    }

    const files = collectFiles(formData);

    if (files.length === 0) {
      return jsonError("At least one file is required.", 400);
    }

    await connectToDatabase();

    const createdPhotos: UploadSuccess[] = [];
    const failedFiles: UploadFailure[] = [];

    for (const file of files) {
      if (!isImageFile(file)) {
        failedFiles.push({
          fileName: file.name || "Unknown file",
          error: "Only image files are supported.",
        });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const metadata = await extractPhotoMetadata(buffer);
        const uploadedImage = await uploadImage(buffer, eventId);
        const locationName = await reverseGeocode(metadata.gps);

        const photo = await Photo.create({
          eventId,
          cloudinaryPublicId: uploadedImage.public_id,
          takenAt: metadata.takenAt,
          gps: metadata.gps,
          locationName,
        });

        createdPhotos.push({
          fileName: file.name || uploadedImage.public_id,
          photo: photo.toObject(),
        });
      } catch (fileError) {
        failedFiles.push({
          fileName: file.name || "Unknown file",
          error:
            fileError instanceof Error ? fileError.message : "Failed to upload file.",
        });
      }
    }

    if (createdPhotos.length === 0) {
      return createUploadResponse(
        {
          photos: createdPhotos,
          failedFiles,
        },
        400
      );
    }

    return createUploadResponse(
      {
        photos: createdPhotos,
        failedFiles,
      },
      failedFiles.length > 0 ? 207 : 201
    );
  } catch (error) {
    if (error instanceof CloudinaryConfigurationError) {
      return jsonError(error.message, 500);
    }

    if (error instanceof CloudinaryUploadError) {
      return jsonError(error.message, 502);
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to upload photos.",
      500
    );
  }
}